"use client";

import { useCallback, useState } from "react";
import type { CameraNudge } from "@/radar/types";

/** Globe camera nudge only — orchestrator pairs with selection. */
export function useGlobeCameraPipeline() {
  const [camera, setCamera] = useState<CameraNudge>({
    token: 0,
    lat: 0,
    lng: 0,
    alt: 0.42,
    transitionMs: 1600,
  });

  const nudgeTo = useCallback((lat: number, lng: number, povAlt = 0.38, transitionMs = 1600) => {
    setCamera({ token: Date.now(), lat, lng, alt: povAlt, transitionMs });
  }, []);

  const snapPovTo = useCallback((lat: number, lng: number, povAlt = 0.36, transitionMs = 0) => {
    setCamera({ token: Date.now(), lat, lng, alt: povAlt, transitionMs });
  }, []);

  return { camera, nudgeTo, snapPovTo };
}
