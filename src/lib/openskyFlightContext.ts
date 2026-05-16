export type OpenSkyFlightContextFlight = {
  icao24: string;
  callsign: string | null;
  firstSeen: number | null;
  lastSeen: number | null;
  estDepartureAirport: string | null;
  estArrivalAirport: string | null;
  /** ADSB.lol / v2/hex when available */
  registration?: string | null;
  typeCode?: string | null;
};

export type OpenSkyFlightContextResponse = {
  ok: boolean;
  error?: string;
  /** Upstream 429 — no new row; UI should not retry aggressively. */
  rateLimited?: boolean;
  window: { begin: number; end: number };
  /** Rows in the 2h window matching this ICAO24 (0 if none). */
  matches: number;
  flight: OpenSkyFlightContextFlight | null;
};

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

export function parseOpenSkyFlightRow(x: unknown): OpenSkyFlightContextFlight | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const icao =
    str(o.icao24)?.toLowerCase() ??
    (typeof o.icao24 === "string" ? o.icao24.trim().toLowerCase() : null);
  if (!icao) return null;
  return {
    icao24: icao,
    callsign: str(o.callsign),
    firstSeen: num(o.firstSeen),
    lastSeen: num(o.lastSeen),
    estDepartureAirport: str(o.estDepartureAirport),
    estArrivalAirport: str(o.estArrivalAirport),
  };
}

export function normCallsignKey(s: string | null | undefined): string {
  return (s ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function pickFlightForIcao(
  rows: OpenSkyFlightContextFlight[],
  icao24: string,
  callsignHint: string | null,
): OpenSkyFlightContextFlight | null {
  const want = icao24.trim().toLowerCase();
  const mine = rows.filter((r) => r.icao24 === want);
  if (!mine.length) return null;
  const hint = normCallsignKey(callsignHint);
  if (hint.length >= 3) {
    const pre = hint.slice(0, 3);
    const hit = mine.find((r) => normCallsignKey(r.callsign).startsWith(pre));
    if (hit) return hit;
  }
  return mine.sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0))[0] ?? null;
}
