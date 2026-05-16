import { NextRequest, NextResponse } from "next/server";
import { buildOpenSkyStatesHeaders, invalidateOpenSkyTokenCache } from "@/lib/openskyOAuth";

const OPENSKY = "https://opensky-network.org/api/states/all";
const MAX_STATES = 9000;

/** Same bbox URL must not hit OpenSky faster than this (anonymous ~10s rule). */
const MIN_UPSTREAM_INTERVAL_MS = 10_800;
/** On 429, serve last good payload if younger than this. */
const STALE_ON_429_MS = 90_000;

type CachedBody = { ok: true; time: number | null; states: unknown[] };

const responseCache = new Map<string, { savedAt: number; body: CachedBody }>();

function pruneCache() {
  while (responseCache.size > 20) {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [k, v] of responseCache.entries()) {
      if (v.savedAt < oldestAt) {
        oldestAt = v.savedAt;
        oldestKey = k;
      }
    }
    if (oldestKey) responseCache.delete(oldestKey);
    else break;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lamin = searchParams.get("lamin");
  const lomin = searchParams.get("lomin");
  const lamax = searchParams.get("lamax");
  const lomax = searchParams.get("lomax");

  let url = OPENSKY;
  if (lamin && lomin && lamax && lomax) {
    url += `?lamin=${encodeURIComponent(lamin)}&lomin=${encodeURIComponent(lomin)}&lamax=${encodeURIComponent(lamax)}&lomax=${encodeURIComponent(lomax)}`;
  }

  const now = Date.now();
  const cached = responseCache.get(url);
  if (cached && now - cached.savedAt < MIN_UPSTREAM_INTERVAL_MS) {
    return NextResponse.json(cached.body, {
      headers: {
        ...cacheHeaders(),
        "X-Opensky-Edge": "cached-min-interval",
      },
    });
  }

  let headers: HeadersInit;
  try {
    headers = await buildOpenSkyStatesHeaders();
  } catch {
    headers = { Accept: "application/json" };
  }

  try {
    let res = await fetch(url, {
      headers,
      next: { revalidate: 8 },
    });

    if (res.status === 401) {
      invalidateOpenSkyTokenCache();
      try {
        headers = await buildOpenSkyStatesHeaders();
      } catch {
        headers = { Accept: "application/json" };
      }
      res = await fetch(url, {
        headers,
        next: { revalidate: 8 },
      });
    }

    if (res.status === 429) {
      if (cached && now - cached.savedAt < STALE_ON_429_MS) {
        return NextResponse.json(cached.body, {
          status: 200,
          headers: {
            ...cacheHeaders(),
            "X-Opensky-Edge": "stale-on-429",
          },
        });
      }
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: "Too Many Requests",
          detail: text.slice(0, 500),
          time: null,
          states: [],
        },
        { status: 429, headers: cacheHeaders() },
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: res.statusText, detail: text.slice(0, 500), time: null, states: [] },
        { status: res.status, headers: cacheHeaders() },
      );
    }

    const raw = (await res.json()) as { time: number | null; states: unknown[] | null };
    const states = Array.isArray(raw.states) ? raw.states.slice(0, MAX_STATES) : [];
    const body: CachedBody = { ok: true, time: raw.time ?? null, states };
    responseCache.set(url, { savedAt: now, body });
    pruneCache();

    return NextResponse.json(body, { headers: cacheHeaders() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json(
      { ok: false, error: msg, time: null, states: [] },
      { status: 502, headers: cacheHeaders() },
    );
  }
}

function cacheHeaders(): HeadersInit {
  return {
    "Cache-Control": "public, s-maxage=8, stale-while-revalidate=24",
  };
}
