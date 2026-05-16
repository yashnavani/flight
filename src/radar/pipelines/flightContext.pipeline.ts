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
      const r = await fetch(`/api/adsb/aircraft-detail?${q}`, { cache: "no-store" });
      const j = (await r.json()) as OpenSkyFlightContextResponse & { error?: string };
      if (!r.ok) throw new Error(j.error || "flight context");
      if (!j.ok) throw new Error(j.error || "flight context");
      return j;
    },
  });
}
