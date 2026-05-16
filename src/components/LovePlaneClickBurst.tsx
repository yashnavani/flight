"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";

type Heart = {
  id: number;
  leftPct: number;
  topPct: number;
  delayMs: number;
  sizePx: number;
  driftPx: number;
  riseVh: number;
};

/**
 * Ephemeral full-screen heart float — pointer-events none, ~1s, no input capture.
 */
export function LovePlaneClickBurst({ burstId }: { burstId: number }) {
  const [alive, setAlive] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useLayoutEffect(() => {
    setReduceMotion(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false);
  }, []);

  const hearts: Heart[] = useMemo(
    () =>
      Array.from({ length: 14 }, (_, id) => ({
        id,
        leftPct: 4 + Math.random() * 92,
        topPct: 38 + Math.random() * 42,
        delayMs: Math.floor(Math.random() * 160),
        sizePx: 9 + Math.floor(Math.random() * 10),
        driftPx: (Math.random() - 0.5) * 44,
        riseVh: -(22 + Math.random() * 28),
      })),
    [burstId],
  );

  useEffect(() => {
    setAlive(true);
    const t = window.setTimeout(() => setAlive(false), 1100);
    return () => window.clearTimeout(t);
  }, [burstId]);

  if (!burstId || !alive || reduceMotion) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[115] overflow-hidden select-none"
      aria-hidden
    >
      {hearts.map((h) => (
        <span
          key={`${burstId}-${h.id}`}
          className="love-plane-click-heart absolute text-rose-300/85"
          style={{
            left: `${h.leftPct}%`,
            top: `${h.topPct}%`,
            fontSize: h.sizePx,
            animationDelay: `${h.delayMs}ms`,
            ["--love-drift" as string]: `${h.driftPx}px`,
            ["--love-rise" as string]: `${h.riseVh}vh`,
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
}
