"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Aircraft } from "@/lib/opensky";

/** Append-only trail cache for selected aircraft polyline. */
export function useTrailHistoryPipeline(input: {
  fleet: Aircraft[];
  selectedIcao: string | null;
  dataUpdatedAt: number;
}): [number, number][] {
  const trailRef = useRef<Map<string, [number, number][]>>(new Map());

  useEffect(() => {
    for (const a of input.fleet) {
      const prev = trailRef.current.get(a.icao24) ?? [];
      const last = prev[prev.length - 1];
      const next =
        last && last[0] === a.lat && last[1] === a.lng
          ? prev
          : [...prev, [a.lat, a.lng] as [number, number]].slice(-48);
      trailRef.current.set(a.icao24, next);
    }
  }, [input.fleet]);

  return useMemo(() => {
    if (!input.selectedIcao) return [];
    return trailRef.current.get(input.selectedIcao) ?? [];
  }, [input.selectedIcao, input.dataUpdatedAt]);
}
