"use client";

import { useMemo } from "react";
import { airportsNearPov } from "@/data/majorAirports";
import type { GlobePov } from "@/radar/types";

/** Hub labels derived from camera POV — no network. */
export function useAirportLabelsPipeline(pov: GlobePov) {
  return useMemo(() => airportsNearPov(pov), [pov.lat, pov.lng, pov.altitude]);
}
