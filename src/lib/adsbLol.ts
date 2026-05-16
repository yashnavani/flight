import type { Aircraft, BBox } from "@/lib/opensky";

const FT_TO_M = 0.3048;
const KT_TO_MS = 0.514444;
const FPM_TO_MS = 0.00508;

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t : null;
  }
  return null;
}

function bool(v: unknown): boolean {
  return v === true || v === 1;
}

/** Bbox size in nm + half-diagonal used for ADSB coverage planning. */
export function bboxNmHalfDiagonal(b: BBox): {
  midLat: number;
  midLon: number;
  latNm: number;
  lonNm: number;
  halfDiagNm: number;
} {
  const midLat = (b.lamin + b.lamax) / 2;
  let lo0 = b.lomin;
  let lo1 = b.lomax;
  if (lo0 > lo1) {
    const t = lo0;
    lo0 = lo1;
    lo1 = t;
  }
  const midLon = (lo0 + lo1) / 2;
  const latDeg = Math.max(0.02, Math.abs(b.lamax - b.lamin));
  const lonDeg = Math.max(0.02, Math.abs(lo1 - lo0));
  const latNm = latDeg * 60;
  const lonNm = lonDeg * 60 * Math.cos((midLat * Math.PI) / 180);
  const halfDiagNm = Math.hypot(latNm, lonNm) * 0.55 + 12;
  return { midLat, midLon, latNm, lonNm, halfDiagNm };
}

function normLon180(lo: number): number {
  let v = lo;
  while (v < -180) v += 360;
  while (v > 180) v -= 360;
  return v;
}

/** Map view bbox → ADSB.lol point search (max 250 nm per call). */
export function bboxToAdsbLatLonDistNm(b: BBox): { lat: number; lon: number; distNm: number } {
  const { midLat, midLon, halfDiagNm } = bboxNmHalfDiagonal(b);
  const distNm = Math.min(250, Math.max(25, Math.round(halfDiagNm * 10) / 10));
  return { lat: midLat, lon: midLon, distNm };
}

/**
 * One 250 nm disk cannot cover a zoomed-out map. Use a small grid of ADSB.lol calls
 * (same API max dist) and merge — capped to limit burst rate.
 */
export function buildAdsbQueriesForBBox(b: BBox): { lat: number; lon: number; dist: number }[] {
  const { halfDiagNm } = bboxNmHalfDiagonal(b);
  const primary = bboxToAdsbLatLonDistNm(b);

  let g = 1;
  if (halfDiagNm > 235 && halfDiagNm <= 500) g = 2;
  else if (halfDiagNm > 500) g = 3;

  if (g === 1) {
    return [{ lat: primary.lat, lon: primary.lon, dist: primary.distNm }];
  }

  const out: { lat: number; lon: number; dist: number }[] = [];
  for (let i = 0; i < g; i++) {
    for (let j = 0; j < g; j++) {
      const la = b.lamin + ((b.lamax - b.lamin) * (i + 0.5)) / g;
      const lo = normLon180(b.lomin + ((b.lomax - b.lomin) * (j + 0.5)) / g);
      out.push({ lat: la, lon: lo, dist: 250 });
    }
  }
  return out;
}

export function mergeAircraftByIcao(rows: Aircraft[]): Aircraft[] {
  const m = new Map<string, Aircraft>();
  for (const a of rows) {
    const prev = m.get(a.icao24);
    if (!prev || (a.timePosition ?? 0) >= (prev.timePosition ?? 0)) m.set(a.icao24, a);
  }
  const out = Array.from(m.values());
  out.sort((x, y) => (y.timePosition ?? 0) - (x.timePosition ?? 0));
  return out;
}

export type AdsbV2Response = {
  ac?: unknown[] | null;
  now?: number | null;
  msg?: string | null;
};

export function parseAdsbV2Response(raw: AdsbV2Response): Aircraft[] {
  const nowMs = typeof raw.now === "number" && Number.isFinite(raw.now) ? raw.now : Date.now();
  const rows = Array.isArray(raw.ac) ? raw.ac : [];
  const out: Aircraft[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const a = adsbAcRowToAircraft(row as Record<string, unknown>, nowMs);
    if (a) out.push(a);
  }
  out.sort((x, y) => (y.timePosition ?? 0) - (x.timePosition ?? 0));
  return out;
}

function adsbAcRowToAircraft(o: Record<string, unknown>, nowMs: number): Aircraft | null {
  const hexRaw = str(o.hex);
  if (!hexRaw) return null;
  const icao24 = hexRaw.toLowerCase().replace(/[^a-f0-9]/g, "");
  if (icao24.length < 4) return null;

  const lat = num(o.lat);
  const lon = num(o.lon);
  if (lat === null || lon === null) return null;

  const altBaro = o.alt_baro;
  let onGround = false;
  let baroAltitude: number | null = null;
  if (altBaro === "ground") {
    onGround = true;
  } else {
    const ft = num(altBaro);
    if (ft !== null) baroAltitude = ft * FT_TO_M;
  }

  const geomFt = num(o.alt_geom);
  const geoAltitude = geomFt !== null ? geomFt * FT_TO_M : null;

  const gsKt = num(o.gs);
  const velocity = gsKt !== null ? gsKt * KT_TO_MS : null;

  const heading = num(o.track);

  const br = num(o.baro_rate);
  const verticalRate = br !== null ? br * FPM_TO_MS : null;

  const nowSec = Math.floor(nowMs / 1000);
  const seenPos = num(o.seen_pos);
  const seen = num(o.seen);
  const ageSec = Math.max(0, Math.round(seenPos ?? seen ?? 0));
  const timePosition = nowSec - ageSec;
  const lastContact = timePosition;

  const flight = str(o.flight);
  const registration = str(o.r);
  const icaoType = str(o.t);
  const emitterCategoryStr = str(o.category);

  return {
    icao24,
    callsign: flight,
    originCountry: "",
    lat,
    lng: lon,
    baroAltitude,
    geoAltitude,
    onGround,
    velocity,
    heading,
    verticalRate,
    squawk: str(o.squawk),
    category: null,
    positionSource: 0,
    spi: bool(o.spi),
    lastContact,
    timePosition,
    registration,
    icaoType,
    emitterCategoryStr,
  };
}
