"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bboxFromPointOfView, type BBox } from "@/lib/opensky";
import { getDefaultHomePov } from "@/radar/constants";
import type { GlobePov } from "@/radar/types";

const FEED_DEBOUNCE_MS = 1100;

/** Camera → viewport bbox + debounced bbox for live fleet (ADSB.lol). */
export function useViewBoundsPipeline() {
  const home0 = getDefaultHomePov();
  const initialBbox = bboxFromPointOfView(home0.lat, home0.lng, home0.altitude);
  const povTimer = useRef<number>(0);
  const feedTimer = useRef<number>(0);
  const viewportRaf = useRef<number | null>(null);
  const pendingViewport = useRef<BBox>(initialBbox);
  const [pov, setPov] = useState<GlobePov>(home0);
  const [viewportBBox, setViewportBBox] = useState<BBox>(initialBbox);
  const [feedBBox, setFeedBBox] = useState<BBox>(initialBbox);

  const scheduleViewport = useCallback(() => {
    if (viewportRaf.current != null) return;
    viewportRaf.current = window.requestAnimationFrame(() => {
      viewportRaf.current = null;
      setViewportBBox(pendingViewport.current);
    });
  }, []);

  const onViewChange = useCallback((lat: number, lng: number, altitude: number) => {
    const next = bboxFromPointOfView(lat, lng, altitude);
    pendingViewport.current = next;
    scheduleViewport();

    window.clearTimeout(feedTimer.current);
    feedTimer.current = window.setTimeout(() => {
      setFeedBBox(pendingViewport.current);
    }, FEED_DEBOUNCE_MS);

    window.clearTimeout(povTimer.current);
    povTimer.current = window.setTimeout(() => {
      setPov({ lat, lng, altitude });
    }, 260);
  }, [scheduleViewport]);

  /** Skip feed debounce — use after imperative camera moves (e.g. GPS “track me”). */
  const syncBboxFromGlobeAlt = useCallback((lat: number, lng: number, globeAltitude: number) => {
    const next = bboxFromPointOfView(lat, lng, globeAltitude);
    pendingViewport.current = next;
    if (viewportRaf.current != null) {
      window.cancelAnimationFrame(viewportRaf.current);
      viewportRaf.current = null;
    }
    window.clearTimeout(feedTimer.current);
    window.clearTimeout(povTimer.current);
    setViewportBBox(next);
    setFeedBBox(next);
    setPov({ lat, lng, altitude: globeAltitude });
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(povTimer.current);
      window.clearTimeout(feedTimer.current);
      if (viewportRaf.current != null) window.cancelAnimationFrame(viewportRaf.current);
    },
    [],
  );

  return { feedBBox, viewportBBox, pov, onViewChange, syncBboxFromGlobeAlt };
}
