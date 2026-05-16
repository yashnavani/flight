"use client";

import { useCallback, useMemo, useState } from "react";
import type { Aircraft } from "@/lib/opensky";

/** Which aircraft is “picked” — data always resolved from current fleet snapshot. */
export function useSelectionPipeline(fleet: Aircraft[]) {
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!selectedIcao) return null;
    return fleet.find((a) => a.icao24 === selectedIcao) ?? null;
  }, [fleet, selectedIcao]);

  const selectByIcao = useCallback((icao: string) => {
    setSelectedIcao(icao);
  }, []);

  const clear = useCallback(() => {
    setSelectedIcao(null);
  }, []);

  return { selectedIcao, selected, selectByIcao, clearSelection: clear };
}
