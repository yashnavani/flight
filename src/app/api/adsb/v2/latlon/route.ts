import { NextRequest, NextResponse } from "next/server";

const UPSTREAM = "https://api.adsb.lol/v2";

const UA = "HerFlightRadar/1.0 (+https://github.com)";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const dist = Number(searchParams.get("dist"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(dist)) {
    return NextResponse.json({ ok: false, error: "lat, lon, dist required" }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ ok: false, error: "lat/lon out of range" }, { status: 400 });
  }
  if (dist < 5 || dist > 250) {
    return NextResponse.json({ ok: false, error: "dist must be 5–250 nm" }, { status: 400 });
  }

  const url = `${UPSTREAM}/lat/${encodeURIComponent(lat)}/lon/${encodeURIComponent(lon)}/dist/${encodeURIComponent(dist)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      next: { revalidate: 0 },
    });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: res.statusText, detail: text.slice(0, 400) },
        { status: res.status === 429 ? 429 : 502 },
      );
    }
    const json = JSON.parse(text) as Record<string, unknown>;
    return NextResponse.json(json, {
      headers: { "Cache-Control": "public, max-age=6, stale-while-revalidate=18" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
