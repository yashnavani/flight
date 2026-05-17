"use client";

import { useQuery } from "@tanstack/react-query";
import type { Aircraft } from "@/lib/opensky";
import type { OpenSkyFlightContextResponse } from "@/lib/openskyFlightContext";

/** Extra strip data from ADSB.lol v2/hex (registration, type). */
export function useFlightContextPipeline(selected: Aircraft | null) {
  const icao = selected?.icao24 ?? null;
  const cs = selected?.callsign?.trim() ?? "";

  return useQuery({
    queryKey: ["adsb-aircraft-detail", icao, cs],
    enabled: Boolean(icao),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 0,
    queryFn: async (): Promise<OpenSkyFlightContextResponse> => {
      const q = new URLSearchParams({ icao24: icao! });
      let r: Response;
      try {
        r = await fetch(`/api/adsb/aircraft-detail?${q}`, { cache: "no-store" });
      } catch {
        return {
          ok: true,
          flight: null,
          matches: 0,
          window: { begin: 0, end: 0 },
          detailSkipped: true,
        };
      }
      let j: OpenSkyFlightContextResponse & { error?: string };
      try {
        j = (await r.json()) as OpenSkyFlightContextResponse & { error?: string };
      } catch {
        return {
          ok: true,
          flight: null,
          matches: 0,
          window: { begin: 0, end: 0 },
          detailSkipped: true,
        };
      }
      if (!r.ok) {
        if (j.ok === true) return j;
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      if (!j.ok) throw new Error(j.error || "flight context");
      return j;
    },
  });
}
