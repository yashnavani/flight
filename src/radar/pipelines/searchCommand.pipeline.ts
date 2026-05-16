"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Aircraft } from "@/lib/opensky";

export function useSearchCommandPipeline(input: {
  /** All aircraft in current feed (for search / Fly — not viewport-limited). */
  fleetAll: Aircraft[];
  /** Subset for globe when search box is empty (viewport performance). */
  fleetViewport: Aircraft[];
  onFlyTo: (a: Aircraft) => void;
  onPaletteOpen?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const flyRef = useRef(input.onFlyTo);
  flyRef.current = input.onFlyTo;
  const prevPalette = useRef(false);

  useEffect(() => {
    if (paletteOpen && !prevPalette.current) input.onPaletteOpen?.();
    prevPalette.current = paletteOpen;
  }, [paletteOpen, input.onPaletteOpen]);

  const filtered = useMemo(() => {
    const raw = search.trim().toUpperCase().replace(/\s+/g, "");
    if (!raw) return input.fleetViewport;
    const q = raw.startsWith("0X") ? raw.slice(2) : raw;
    return input.fleetAll.filter((a) => {
      const cs = a.callsign?.trim().toUpperCase() ?? "";
      const reg = a.registration?.trim().toUpperCase() ?? "";
      const hex = a.icao24.toUpperCase();
      return (cs && cs.includes(q)) || (reg && reg.includes(q)) || hex.includes(q);
    });
  }, [input.fleetAll, input.fleetViewport, search]);

  /** With active query: show matches worldwide; no matches → keep viewport traffic so globe is not empty. */
  const displayForGlobe = useMemo(() => {
    if (!search.trim()) return input.fleetViewport;
    return filtered.length ? filtered : input.fleetViewport;
  }, [search, filtered, input.fleetViewport]);

  const flyToFirstMatch = useCallback(() => {
    const t = filtered[0];
    if (t) flyRef.current(t);
  }, [filtered]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [paletteOpen]);

  return {
    search,
    setSearch,
    paletteOpen,
    setPaletteOpen,
    searchRef,
    filtered,
    displayForGlobe,
    flyToFirstMatch,
  };
}
