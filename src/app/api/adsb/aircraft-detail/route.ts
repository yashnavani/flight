import { NextRequest, NextResponse } from "next/server";
import type {
  OpenSkyFlightContextFlight,
  OpenSkyFlightContextResponse,
} from "@/lib/openskyFlightContext";
import { mergeEstAirports, openSkyPickFromRecentWindow } from "@/lib/openSkyFlightsRecent";

const UPSTREAM = "https://api.adsb.lol/v2/hex";
const UA = "HerFlightRadar/1.0 (+https://github.com)";

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t : null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const icao24 = req.nextUrl.searchParams.get("icao24")?.trim().toLowerCase().replace(/[^a-f0-9]/g, "");
  if (!icao24 || icao24.length < 4) {
    return NextResponse.json({ ok: false, error: "icao24 required" }, { status: 400 });
  }

  const url = `${UPSTREAM}/${encodeURIComponent(icao24)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8_000),
    });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: res.statusText, detail: text.slice(0, 400) },
        { status: res.status === 429 ? 429 : 502 },
      );
    }
    const json = JSON.parse(text) as { ac?: Record<string, unknown>[]; now?: number };
    const rowRec =
      Array.isArray(json.ac) && json.ac[0] ? (json.ac[0] as Record<string, unknown>) : null;
    function filedDep(o: Record<string, unknown>): string | null {
      return (
        str(o.estDepartureAirport) ??
        str(o.origin) ??
        str(o.flight_origin) ??
        str(o.departure) ??
        str(o.from) ??
        str(o.orig_iata) ??
        str(o.o_icao) ??
        str(o.icao_origin) ??
        str(o.planned_departure_airport) ??
        str(o.planned_dep_airport) ??
        str(o.schd_from) ??
        str(o.scheduled_departure_airport)
      );
    }

    function filedArr(o: Record<string, unknown>): string | null {
      return (
        str(o.estArrivalAirport) ??
        str(o.destination) ??
        str(o.flight_destination) ??
        str(o.arrival) ??
        str(o.to) ??
        str(o.dest_iata) ??
        str(o.d_icao) ??
        str(o.icao_destination) ??
        str(o.planned_arrival_airport) ??
        str(o.planned_arr_airport) ??
        str(o.schd_to) ??
        str(o.scheduled_arrival_airport)
      );
    }

    function routeFromStringField(o: Record<string, unknown>): { dep: string | null; arr: string | null } {
      const raw = str(o.route) ?? str(o.filed_route) ?? str(o.flight_route);
      if (!raw) return { dep: null, arr: null };
      const parts = raw
        .split(/[-–—/]+/)
        .map((x) => x.trim().toUpperCase())
        .filter((x) => /^[A-Z0-9]{3,4}$/.test(x));
      if (parts.length >= 2) {
        const dep = /^[A-Z0-9]{3,4}$/.test(parts[0]) ? parts[0] : null;
        const last = parts[parts.length - 1];
        const arr = /^[A-Z0-9]{3,4}$/.test(last) ? last : null;
        return { dep, arr };
      }
      return { dep: null, arr: null };
    }

    const routePair = rowRec ? routeFromStringField(rowRec) : { dep: null, arr: null };

    let flight: OpenSkyFlightContextFlight | null = rowRec
      ? {
          icao24: str(rowRec.hex)?.toLowerCase() ?? icao24,
          callsign: str(rowRec.flight),
          firstSeen: null as number | null,
          lastSeen: null as number | null,
          estDepartureAirport: filedDep(rowRec) ?? routePair.dep,
          estArrivalAirport: filedArr(rowRec) ?? routePair.arr,
          registration: str(rowRec.r),
          typeCode: str(rowRec.t),
        }
      : null;

    let rateLimited = false;
    const needRoute =
      !flight || !flight.estDepartureAirport || !flight.estArrivalAirport;

    if (needRoute) {
      const { pick, rateLimited: rl } = await openSkyPickFromRecentWindow(
        icao24,
        flight?.callsign ?? null,
      );
      rateLimited = rl;
      if (pick) flight = mergeEstAirports(flight, pick);
    }

    const body: OpenSkyFlightContextResponse = {
      ok: true,
      window: { begin: 0, end: 0 },
      matches: rowRec ? 1 : 0,
      flight,
      ...(rateLimited ? { rateLimited: true } : {}),
    };

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=45, stale-while-revalidate=120" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
