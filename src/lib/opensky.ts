/** OpenSky Network state vector row (array form). */
export type OpenSkyRawState = (string | number | boolean | number[] | null)[];

export type Aircraft = {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  lat: number;
  lng: number;
  baroAltitude: number | null;
  /** WGS84 geometric altitude (GNSS), meters — may differ from baro. */
  geoAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  heading: number | null;
  verticalRate: number | null;
  squawk: string | null;
  /** ADS-B emitter category 0–20 (see OpenSky docs). */
  category: number | null;
  positionSource: number | null;
  spi: boolean;
  lastContact: number | null;
  timePosition: number | null;
  /** Tail number when source provides it (e.g. ADSB.lol). */
  registration?: string | null;
  /** ICAO type designator e.g. B738, C172. */
  icaoType?: string | null;
  /** Raw emitter category e.g. A3 (ADS-B v2). */
  emitterCategoryStr?: string | null;
};

export type BBox = {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
};

export const WORLD_BBOX: BBox = {
  lamin: -90,
  lomin: -180,
  lamax: 90,
  lomax: 180,
};

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

/** Longitude half-width that stays inside ±180° (no dateline wrap in one bbox). */
function lngHalfWithinMeridians(lng: number, latHalfDeg: number): number {
  const want = latHalfDeg * 1.38;
  const room = Math.min(180 - lng, lng + 180) - 0.08;
  return Math.max(0.35, Math.min(want, room));
}

/**
 * Wider when camera is far; tight when zoomed in.
 * Never uses WORLD_BBOX for fetch — OpenSky global sample is sparse; regional box matches radar UX.
 */
export function bboxFromPointOfView(lat: number, lng: number, altitude: number): BBox {
  const alt = Number.isFinite(altitude) ? altitude : 2.5;

  const span =
    alt >= 2.12
      ? clamp(36 + alt * 16, 52, 108)
      : clamp(alt * 44, 2.6, 58);

  const latHalf = span / 2;
  const lngHalf = lngHalfWithinMeridians(lng, latHalf);

  const lamin = clamp(lat - latHalf, -90, 90);
  const lamax = clamp(lat + latHalf, -90, 90);

  let lomin = lng - lngHalf;
  let lomax = lng + lngHalf;
  while (lomin < -180) {
    lomin += 360;
    lomax += 360;
  }
  while (lomin > 180) {
    lomin -= 360;
    lomax -= 360;
  }
  if (lomax > 180) {
    lomax = 180;
    lomin = Math.max(-180, lomax - 2 * lngHalf);
  }

  return { lamin, lomin, lamax, lomax };
}

/**
 * Snap bbox to ~1.1 km grid so tiny camera moves do not change the OpenSky request URL
 * (reduces 429 rate limits).
 */
export function snapFeedBBox(b: BBox): BBox {
  /** ~2.2 km grid — fewer query-key churn / flicker than 0.01° while still regional. */
  const q = (n: number) => Math.round(n * 50) / 50;
  let lamin = q(b.lamin);
  let lamax = q(b.lamax);
  let lomin = q(b.lomin);
  let lomax = q(b.lomax);
  if (lamin > lamax) {
    const t = lamin;
    lamin = lamax;
    lamax = t;
  }
  if (lomin > lomax) {
    const t = lomin;
    lomin = lomax;
    lomax = t;
  }
  return { lamin, lomin, lamax, lomax };
}

function normLng(x: number): number {
  let v = x;
  while (v < -180) v += 360;
  while (v > 180) v -= 360;
  return v;
}

/** True if geographic point lies inside bbox (handles normalized longitudes). */
export function pointInBBox(lat: number, lng: number, b: BBox): boolean {
  if (lat < b.lamin || lat > b.lamax) return false;
  const x = normLng(lng);
  const lo0 = normLng(b.lomin);
  const lo1 = normLng(b.lomax);
  if (lo0 <= lo1) return x >= lo0 && x <= lo1;
  return x >= lo0 || x <= lo1;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t : null;
  }
  return null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function bool(v: unknown): boolean {
  return v === true;
}

export function parseStateRow(row: OpenSkyRawState): Aircraft | null {
  if (!Array.isArray(row) || row.length < 11) return null;
  const lon = num(row[5]);
  const la = num(row[6]);
  if (lon === null || la === null) return null;

  return {
    icao24: String(row[0] ?? ""),
    callsign: str(row[1]),
    originCountry: str(row[2]) ?? "",
    lat: la,
    lng: lon,
    baroAltitude: num(row[7]),
    geoAltitude: num(row[13] ?? null),
    onGround: bool(row[8]),
    velocity: num(row[9]),
    heading: num(row[10]),
    verticalRate: num(row[11] ?? null),
    squawk: str(row[14] ?? null),
    category: row.length > 17 ? num(row[17]) : null,
    positionSource: row.length > 16 ? num(row[16]) : null,
    spi: bool(row[15] ?? false),
    lastContact: num(row[4]),
    timePosition: num(row[3]),
  };
}

export function parseStatesPayload(raw: {
  time?: number;
  states?: OpenSkyRawState[] | null;
}): Aircraft[] {
  const rows = raw.states;
  if (!Array.isArray(rows)) return [];

  const out: Aircraft[] = [];
  for (const row of rows) {
    const a = parseStateRow(row);
    if (a) out.push(a);
  }
  out.sort((x, y) => (y.timePosition ?? 0) - (x.timePosition ?? 0));
  return out;
}

/** react-globe.gl POV altitude: lower = zoomed in → smaller markers vs terrain. */
export function globeAltitudeToMarkerScaleFactor(camAlt: number): number {
  const a = Number.isFinite(camAlt) ? Math.max(0.04, camAlt) : 0.4;
  const ref = 0.4;
  const ratio = Math.min(a / ref, 2.35);
  return Math.max(0.14, Math.min(1.02, ratio ** 1.08));
}

export function aircraftToPoint(
  a: Aircraft,
  selected: boolean,
  watched: boolean,
  globeCamAlt?: number,
) {
  const altM = a.baroAltitude ?? 0;
  const altUnit = 0.0012 + Math.min(altM / 450_000, 0.09);
  const base =
    selected ? 0.74 : watched ? 0.58 : a.onGround ? 0.36 : 0.5;
  const zoomF =
    globeCamAlt != null && Number.isFinite(globeCamAlt)
      ? globeAltitudeToMarkerScaleFactor(globeCamAlt)
      : 1;
  const markerScale = base * zoomF;
  return {
    ...a,
    altUnit,
    markerScale,
    color: selected ? "#fbbf24" : watched ? "#c084fc" : a.onGround ? "#94a3b8" : "#22d3ee",
  };
}
