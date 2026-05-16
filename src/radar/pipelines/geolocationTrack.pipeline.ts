"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Input = {
  snapPovTo: (lat: number, lng: number, povAlt: number, transitionMs?: number) => void;
  /** Align ADSB feed bbox with this POV immediately (skips view debounce). */
  syncFeedForPov?: (lat: number, lng: number, povAlt: number) => void;
  onStart: () => void;
  onStop: () => void;
  onGeoError: (message: string) => void;
};

const THROTTLE_MS = 720;

/** Lower = closer “radar” over you; widened when GPS accuracy is poor (globe altitude units). */
function povAltForAccuracy(accuracyM: number | null): number {
  const acc = accuracyM ?? 220;
  const u = Math.min(1, Math.max(0, acc / 480));
  return 0.1 + u * 0.13;
}

/** Browser geolocation → repeated `snapPovTo` (throttled). Toggle start/stop. */
export function useGeolocationTrackPipeline(input: Input) {
  const inputRef = useRef(input);
  inputRef.current = input;

  const watchId = useRef<number | null>(null);
  const lastSnap = useRef(0);
  const hadSuccessfulFix = useRef(false);
  /** First camera move after “Track me” uses a long ease-in zoom. */
  const useLongZoomRef = useRef(true);
  const [active, setActive] = useState(false);
  /** Latest browser fix (for HUD); cleared when tracking stops. */
  const [lastFix, setLastFix] = useState<{
    lat: number;
    lng: number;
    accuracyM: number | null;
  } | null>(null);

  const clearWatch = useCallback(() => {
    if (watchId.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
  }, []);

  const stop = useCallback(
    (opts?: { silent?: boolean }) => {
      clearWatch();
      setActive(false);
      setLastFix(null);
      const shouldToastOff = !opts?.silent && hadSuccessfulFix.current;
      hadSuccessfulFix.current = false;
      if (shouldToastOff) inputRef.current.onStop();
    },
    [clearWatch],
  );

  const cancelLocateMe = useCallback(() => stop({ silent: true }), [stop]);

  const start = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      inputRef.current.onGeoError("Geolocation not available");
      return;
    }
    clearWatch();
    setActive(true);
    lastSnap.current = 0;
    hadSuccessfulFix.current = false;
    useLongZoomRef.current = true;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!hadSuccessfulFix.current) {
          hadSuccessfulFix.current = true;
          inputRef.current.onStart();
        }
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const accuracyM = accuracy != null && Number.isFinite(accuracy) ? accuracy : null;
        setLastFix({ lat, lng, accuracyM });
        const now = performance.now();
        if (now - lastSnap.current < THROTTLE_MS) return;
        const longZoom = useLongZoomRef.current;
        if (useLongZoomRef.current) useLongZoomRef.current = false;
        lastSnap.current = now;

        const povAlt = povAltForAccuracy(accuracyM);
        inputRef.current.snapPovTo(lat, lng, povAlt, longZoom ? 2400 : 950);
        inputRef.current.syncFeedForPov?.(lat, lng, povAlt);
      },
      (err) => {
        clearWatch();
        setActive(false);
        setLastFix(null);
        hadSuccessfulFix.current = false;
        inputRef.current.onGeoError(err.message || "position error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 25_000,
      },
    );
  }, [clearWatch]);

  const toggleLocateMe = useCallback(() => {
    if (watchId.current != null) {
      stop();
      return;
    }
    start();
  }, [start, stop]);

  useEffect(() => () => clearWatch(), [clearWatch]);

  return { locatingMe: active, lastGeoFix: lastFix, toggleLocateMe, stopLocateMe: stop, cancelLocateMe };
}
