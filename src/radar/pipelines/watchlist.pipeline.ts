"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Aircraft } from "@/lib/opensky";
import { WATCH_STORAGE_KEY } from "@/radar/constants";

function loadWatch(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(WATCH_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistWatch(s: Set<string>) {
  localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify([...s]));
}

/** Watchlist storage + in-view discovery toasts (uses `pushLove` from toast pipeline). */
export function useWatchlistPipeline(input: {
  fleet: Aircraft[];
  onWatchSpotted: (label: string) => void;
}) {
  const [watch, setWatch] = useState<Set<string>>(() => new Set());
  const watchSeen = useRef<Set<string>>(new Set());
  const watchBoot = useRef(false);

  useEffect(() => {
    setWatch(loadWatch());
  }, []);

  const watchedHere = useMemo(
    () => input.fleet.filter((a) => watch.has(a.icao24)),
    [input.fleet, watch],
  );

  const toggleIcao = useCallback((icao: string | null): boolean | undefined => {
    if (!icao) return undefined;
    let added = false;
    setWatch((prev) => {
      const n = new Set(prev);
      if (n.has(icao)) {
        n.delete(icao);
        added = false;
      } else {
        n.add(icao);
        added = true;
      }
      persistWatch(n);
      return n;
    });
    return added;
  }, []);

  useEffect(() => {
    const now = new Set(watchedHere.map((a) => a.icao24));
    if (!watchBoot.current) {
      watchBoot.current = true;
      watchSeen.current = now;
      return;
    }
    for (const id of now) {
      if (!watchSeen.current.has(id)) {
        const ac = watchedHere.find((a) => a.icao24 === id);
        if (ac) input.onWatchSpotted(ac.callsign?.trim() || id);
      }
    }
    watchSeen.current = now;
  }, [watchedHere, input.onWatchSpotted]);

  return { watchSet: watch, watchedHere, toggleIcao };
}
