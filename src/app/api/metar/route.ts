import { NextRequest, NextResponse } from "next/server";

function normalizeIds(raw: string | null, fallback: string): string {
  const base = (raw || fallback).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return base.slice(0, 4) || "VABB";
}

export async function GET(req: NextRequest) {
  const ids = normalizeIds(
    req.nextUrl.searchParams.get("ids"),
    process.env.NEXT_PUBLIC_HOME_AIRPORT_ICAO ?? "VABB",
  );

  const url = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(ids)}&format=json`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 120 },
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: res.statusText, ids, raw: null },
        { status: res.status, headers: cacheHeaders() },
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "invalid JSON from AWC", ids, raw: text.slice(0, 200) },
        { status: 502, headers: cacheHeaders() },
      );
    }

    const raw = extractRawMetar(json);
    const flightCategory = extractFlightCategory(json);

    return NextResponse.json(
      { ok: true, ids, raw, flightCategory },
      { headers: cacheHeaders() },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json(
      { ok: false, error: msg, ids, raw: null },
      { status: 502, headers: cacheHeaders() },
    );
  }
}

function cacheHeaders(): HeadersInit {
  return { "Cache-Control": "public, s-maxage=90, stale-while-revalidate=180" };
}

function extractRawMetar(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  if (typeof o.rawOb === "string") return o.rawOb;

  const tryArray = (arr: unknown): string | null => {
    if (!Array.isArray(arr) || !arr.length) return null;
    for (const item of arr) {
      if (typeof item === "string" && item.startsWith("METAR")) return item;
      if (item && typeof item === "object") {
        const row = item as { rawOb?: string; rawText?: string; receiptTime?: string };
        if (typeof row.rawOb === "string") return row.rawOb;
        if (typeof row.rawText === "string") return row.rawText;
      }
    }
    return null;
  };

  const fromData = tryArray(o.data);
  if (fromData) return fromData;

  const reports = tryArray(o.reports);
  if (reports) return reports;

  return null;
}

function extractFlightCategory(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (typeof o.flightCategory === "string") return o.flightCategory;

  const pick = (item: unknown): string | null => {
    if (!item || typeof item !== "object") return null;
    const fc = (item as { flightCategory?: string }).flightCategory;
    return typeof fc === "string" ? fc : null;
  };

  if (Array.isArray(o.data)) {
    for (const item of o.data) {
      const fc = pick(item);
      if (fc) return fc;
    }
  }
  const reports = o.reports;
  if (Array.isArray(reports)) {
    for (const item of reports) {
      const fc = pick(item);
      if (fc) return fc;
    }
  }
  return null;
}
