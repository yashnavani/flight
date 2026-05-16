import { NextRequest, NextResponse } from "next/server";
import { describeWmoWeatherCode } from "@/lib/wmoWeatherCode";
import type { SurfaceWeatherPayload } from "@/lib/surfaceWeatherTypes";

const UPSTREAM = "https://api.open-meteo.com/v1/forecast";

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function bool01(v: unknown): boolean {
  return v === 1 || v === true;
}

export async function GET(req: NextRequest) {
  const latRaw = req.nextUrl.searchParams.get("lat");
  const lngRaw = req.nextUrl.searchParams.get("lng");
  const lat = latRaw != null ? Number(latRaw) : NaN;
  const lng = lngRaw != null ? Number(lngRaw) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ ok: false, error: "lat and lng required (-90..90, -180..180)" }, { status: 400 });
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    timezone: "auto",
    wind_speed_unit: "kn",
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "cloud_cover",
      "is_day",
      "pressure_msl",
    ].join(","),
    hourly: "temperature_2m",
    forecast_hours: "12",
  });

  const url = `${UPSTREAM}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "HerFlightRadar/1.0" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(12_000),
    });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: res.statusText, detail: text.slice(0, 300) },
        { status: 502 },
      );
    }
    const json = JSON.parse(text) as Record<string, unknown>;
    const cur = json.current && typeof json.current === "object" ? (json.current as Record<string, unknown>) : null;
    const hourly = json.hourly && typeof json.hourly === "object" ? (json.hourly as Record<string, unknown>) : null;
    const times = Array.isArray(hourly?.time) ? (hourly!.time as unknown[]) : [];
    const temps = Array.isArray(hourly?.temperature_2m) ? (hourly!.temperature_2m as unknown[]) : [];

    const hourlyOut: SurfaceWeatherPayload["hourly"] = [];
    const n = Math.min(12, times.length, temps.length);
    for (let i = 0; i < n; i++) {
      const t = typeof times[i] === "string" ? (times[i] as string) : "";
      const tc = num(temps[i]);
      if (t && tc != null) hourlyOut.push({ time: t, tempC: tc });
    }

    const code = num(cur?.weather_code);
    const body: SurfaceWeatherPayload = {
      ok: true,
      lat: num(json.latitude) ?? lat,
      lng: num(json.longitude) ?? lng,
      timezone: typeof json.timezone === "string" ? json.timezone : null,
      current: {
        time: typeof cur?.time === "string" ? cur.time : "",
        tempC: num(cur?.temperature_2m),
        apparentC: num(cur?.apparent_temperature),
        rhPct: num(cur?.relative_humidity_2m),
        precipMm: num(cur?.precipitation),
        code,
        condition: code != null ? describeWmoWeatherCode(Math.round(code)) : null,
        windKt: num(cur?.wind_speed_10m),
        windDeg: num(cur?.wind_direction_10m),
        cloudPct: num(cur?.cloud_cover),
        isDay: bool01(cur?.is_day),
        pressureMslHpa: num(cur?.pressure_msl),
      },
      hourly: hourlyOut,
    };

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
