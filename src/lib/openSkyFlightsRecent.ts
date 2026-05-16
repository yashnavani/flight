import { getOpenSkyBearerToken } from "@/lib/openskyOAuth";
import {
  parseOpenSkyFlightRow,
  pickFlightForIcao,
  type OpenSkyFlightContextFlight,
} from "@/lib/openskyFlightContext";

const OPENSKY_FLIGHTS_ALL = "https://opensky-network.org/api/flights/all";

/**
 * OpenSky `/flights/all` in the last 2h (API max). Often includes est dep/arr
 * for flights ADS-B strips omit. Costs flights-bucket credits (see OpenSky docs).
 */
export async function openSkyPickFromRecentWindow(
  icao24: string,
  callsignHint: string | null,
): Promise<{ pick: OpenSkyFlightContextFlight | null; rateLimited: boolean }> {
  const end = Math.floor(Date.now() / 1000);
  const begin = end - 7200;

  const headers: Record<string, string> = { Accept: "application/json" };
  try {
    const t = await getOpenSkyBearerToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  } catch {
    /* anonymous */
  }

  const res = await fetch(`${OPENSKY_FLIGHTS_ALL}?begin=${begin}&end=${end}`, {
    headers,
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(12_000),
  });

  if (res.status === 429) return { pick: null, rateLimited: true };
  if (res.status === 404) return { pick: null, rateLimited: false };
  if (!res.ok) return { pick: null, rateLimited: false };

  let json: unknown;
  try {
    json = JSON.parse(await res.text());
  } catch {
    return { pick: null, rateLimited: false };
  }

  if (!Array.isArray(json)) return { pick: null, rateLimited: false };

  const rows = json
    .map(parseOpenSkyFlightRow)
    .filter((x): x is OpenSkyFlightContextFlight => x !== null);

  return {
    pick: pickFlightForIcao(rows, icao24, callsignHint),
    rateLimited: false,
  };
}

/** Fill only missing filed airports / callsign from OpenSky row. */
export function mergeEstAirports(
  base: OpenSkyFlightContextFlight | null,
  hint: OpenSkyFlightContextFlight,
): OpenSkyFlightContextFlight {
  if (!base) return { ...hint };
  return {
    ...base,
    estDepartureAirport: base.estDepartureAirport ?? hint.estDepartureAirport,
    estArrivalAirport: base.estArrivalAirport ?? hint.estArrivalAirport,
    callsign: base.callsign ?? hint.callsign,
    firstSeen: base.firstSeen ?? hint.firstSeen,
    lastSeen: base.lastSeen ?? hint.lastSeen,
  };
}
