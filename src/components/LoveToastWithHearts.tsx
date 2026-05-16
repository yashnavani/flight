"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Burst = {
  id: number;
  tx: number;
  ty: number;
  rot: number;
  delay: number;
  sc: number;
};

const HEART_REST = "rgba(253, 216, 236, 0.4)";
const HEART_BURST = "rgba(255, 236, 246, 0.26)";

function SideHeartStrip({ side }: { side: "left" | "right" }) {
  const [bits, setBits] = useState<Burst[]>([]);
  const drift = side === "left" ? -1 : 1;

  const pop = useCallback(() => {
    const t0 = performance.now();
    const arr: Burst[] = Array.from({ length: 20 }, (_, i) => ({
      id: t0 + i,
      tx: drift * (22 + Math.random() * 78) + (Math.random() - 0.5) * 34,
      ty: -18 - Math.random() * 110,
      rot: drift * (25 + Math.random() * 85) + (Math.random() - 0.5) * 40,
      delay: i * 0.016,
      sc: 0.4 + Math.random() * 0.75,
    }));
    setBits(arr);
    window.setTimeout(() => setBits([]), 1000);
  }, [drift]);

  return (
    <div className="relative flex w-7 shrink-0 flex-col items-center justify-center gap-0.5 py-0.5 select-none">
      {[0, 1].map((k) => (
        <button
          key={k}
          type="button"
          aria-label="Heart burst"
          onClick={(e) => {
            e.stopPropagation();
            pop();
          }}
          className="rounded p-0.5 leading-none outline-none ring-rose-200/0 transition hover:ring-2 hover:ring-rose-200/15 active:scale-90"
        >
          <span className="block text-[13px]" style={{ color: HEART_REST }}>
            ♥
          </span>
        </button>
      ))}
      <div className="pointer-events-none absolute inset-0 overflow-visible">
        <AnimatePresence>
          {bits.map((b) => (
            <motion.span
              key={b.id}
              className="absolute text-[14px] leading-none"
              style={{
                left: "50%",
                top: "50%",
                marginLeft: -7,
                marginTop: -7,
                color: HEART_BURST,
              }}
              initial={{ opacity: 0.52, scale: 0.22, x: 0, y: 0, rotate: 0 }}
              animate={{
                opacity: 0,
                scale: b.sc,
                x: b.tx,
                y: b.ty,
                rotate: b.rot,
              }}
              exit={{ opacity: 0 }}
              transition={{
                type: "tween",
                duration: 0.92,
                ease: [0.19, 0.82, 0.42, 1],
                delay: b.delay,
              }}
            >
              ♥
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Side gutters with tiny hearts; click → pale heart burst (text stays center column). */
export function LoveToastWithHearts({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-stretch gap-0.5 overflow-visible">
      <SideHeartStrip side="left" />
      <div className="min-w-0 flex-1">{children}</div>
      <SideHeartStrip side="right" />
    </div>
  );
}
