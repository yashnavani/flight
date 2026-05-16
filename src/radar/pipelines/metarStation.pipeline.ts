"use client";

import { useMemo, useState } from "react";
import { HOME_ICAO } from "@/radar/constants";

/** Which station METAR ticker shows — home default until user taps an airport label. */
export function useMetarStationPipeline(defaultIcao = HOME_ICAO) {
  const [overrideIcao, setOverrideIcao] = useState<string | null>(null);

  const activeIcao = useMemo(() => {
    const o = overrideIcao?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    return (o && o.length >= 3 ? o : defaultIcao).slice(0, 4);
  }, [overrideIcao, defaultIcao]);

  return { activeMetarIcao: activeIcao, setMetarStation: setOverrideIcao };
}
