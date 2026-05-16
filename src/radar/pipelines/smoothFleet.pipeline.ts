"use client";

import { useEffect, useRef, useState } from "react";
import type { Aircraft } from "@/lib/opensky";

const EMPTY_HOLD_MS = 1600;
/** Fixed-step ease: few React commits per poll (was ~1 RAF × duration = dozens of full-app renders). */
const EASE_STEPS = 10;
/** Above this, skip easing — one setState per poll. */
const MAX_FLEET_EASE = 220;

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Ease positions between live feed polls (visual only). Holds fleet on brief empty payloads. */
export function useSmoothFleetPipeline(live: Aircraft[], dataUpdatedAt: number): Aircraft[] {
  const [out, setOut] = useState<Aircraft[]>(live);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    if (!live.length) {
      const id = window.setTimeout(() => {
        if (!liveRef.current.length) setOut([]);
      }, EMPTY_HOLD_MS);
      return () => window.clearTimeout(id);
    }

    if (live.length > MAX_FLEET_EASE) {
      setOut(live);
      return;
    }

    let raf = 0;
    let step = 0;

    const tick = () => {
      step += 1;
      const t = smoothstep(Math.min(1, step / EASE_STEPS));
      const cur = liveRef.current;
      setOut((prev) => {
        const pm = new Map(prev.map((x) => [x.icao24, x]));
        return cur.map((c) => {
          const p = pm.get(c.icao24);
          if (!p) return c;
          return {
            ...c,
            lat: p.lat + (c.lat - p.lat) * t,
            lng: p.lng + (c.lng - p.lng) * t,
            baroAltitude:
              p.baroAltitude != null && c.baroAltitude != null
                ? p.baroAltitude + (c.baroAltitude - p.baroAltitude) * t
                : c.baroAltitude,
            geoAltitude:
              p.geoAltitude != null && c.geoAltitude != null
                ? p.geoAltitude + (c.geoAltitude - p.geoAltitude) * t
                : c.geoAltitude,
            velocity:
              p.velocity != null && c.velocity != null
                ? p.velocity + (c.velocity - p.velocity) * t
                : c.velocity,
            heading:
              p.heading != null && c.heading != null
                ? p.heading + (c.heading - p.heading) * t
                : c.heading,
            verticalRate:
              p.verticalRate != null && c.verticalRate != null
                ? p.verticalRate + (c.verticalRate - p.verticalRate) * t
                : c.verticalRate,
          };
        });
      });
      if (step < EASE_STEPS) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dataUpdatedAt]);

  return out.length ? out : live;
}
