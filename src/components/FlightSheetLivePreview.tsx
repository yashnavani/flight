"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useId, useMemo } from "react";
import { metersPerSecToFpm } from "@/lib/aviationFormat";

type Props = {
  headingDeg: number | null;
  verticalRateMps: number | null;
  onGround: boolean;
  watched: boolean;
  follow: boolean;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Degrees nose-up from baro V/S (visual hint only). */
function pitchDegFromVsFpm(fpm: number | null): number {
  if (fpm == null || !Number.isFinite(fpm)) return 0;
  return clamp((fpm / 1800) * 11, -13, 13);
}

/**
 * Top-down jet silhouette + live attitude from ADS-B track & V/S.
 * Helps match “what you see overhead” to this row (heading = nose / gold dot).
 */
export function FlightSheetLivePreview({ headingDeg, verticalRateMps, onGround, watched, follow }: Props) {
  const gid = useId().replace(/:/g, "");
  const gradId = `fuselage-${gid}`;

  const vsFpm = useMemo(() => {
    if (verticalRateMps == null || !Number.isFinite(verticalRateMps)) return null;
    return metersPerSecToFpm(verticalRateMps);
  }, [verticalRateMps]);

  const pitchTarget = onGround ? 0 : pitchDegFromVsFpm(vsFpm);
  const headingTarget = headingDeg != null && Number.isFinite(headingDeg) ? headingDeg : 0;

  const rotSpring = useSpring(headingTarget, { stiffness: 95, damping: 20, mass: 0.45 });
  const pitchSpring = useSpring(pitchTarget, { stiffness: 72, damping: 22, mass: 0.5 });

  useEffect(() => {
    rotSpring.set(headingTarget);
  }, [headingTarget, rotSpring]);

  useEffect(() => {
    pitchSpring.set(pitchTarget);
  }, [pitchTarget, pitchSpring]);

  const negPitch = useTransform(pitchSpring, (p) => -p);

  const accent = watched ? "#c084fc" : follow ? "#fbbf24" : "#22d3ee";
  const accentSoft = watched ? "rgba(192,132,252,0.35)" : follow ? "rgba(251,191,36,0.28)" : "rgba(34,211,238,0.35)";

  return (
    <div
      className="relative isolate w-full max-w-[20rem] overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-slate-900/95 via-slate-950/98 to-slate-950 ring-1 ring-cyan-500/10 sm:max-w-none"
      style={{ perspective: 520 }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 42%, ${accentSoft}, transparent 55%),
            repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(148,163,184,0.06) 11px, rgba(148,163,184,0.06) 12px),
            repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(148,163,184,0.05) 11px, rgba(148,163,184,0.05) 12px)`,
        }}
        aria-hidden
      />
      <p className="relative px-3 pt-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        Live attitude (ADS-B)
      </p>
      <div className="relative flex h-[9.5rem] w-full items-center justify-center sm:h-[10.5rem]">
        <motion.div
          className="flex items-center justify-center"
          animate={onGround ? { y: 0 } : { y: [0, -5, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="will-change-transform"
            style={{
              rotate: rotSpring,
              rotateX: negPitch,
              transformStyle: "preserve-3d",
            }}
          >
            <svg
              viewBox="0 0 200 200"
              className="h-32 w-32 sm:h-36 sm:w-36"
              style={{
                filter: follow
                  ? "drop-shadow(0 0 20px rgba(251,191,36,0.35))"
                  : watched
                    ? "drop-shadow(0 0 18px rgba(192,132,252,0.32))"
                    : "drop-shadow(0 0 18px rgba(34,211,238,0.28))",
              }}
              aria-hidden
            >
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
                </linearGradient>
              </defs>
              <g stroke="rgba(248,250,252,0.35)" strokeWidth="1.2" fill={`url(#${gradId})`}>
                <path d="M100 34 L108 52 L104 58 L104 118 L118 128 L112 138 L100 128 L88 138 L82 128 L96 118 L96 58 L92 52 Z" />
                <path
                  d="M 40 100 L 160 100 L 152 108 L 48 108 Z"
                  fill={accent}
                  fillOpacity="0.55"
                  stroke="rgba(248,250,252,0.45)"
                />
                <path d="M100 128 L100 168 L96 174 L104 174 Z" fill="#1e293b" stroke="rgba(248,250,252,0.3)" />
                <circle cx="100" cy="46" r="5" fill="rgba(251,191,36,0.9)" stroke="none" />
              </g>
              <line x1="100" y1="100" x2="100" y2="28" stroke="rgba(251,191,36,0.5)" strokeWidth="1.5" strokeDasharray="4 5" />
            </svg>
          </motion.div>
        </motion.div>
      </div>
      <p className="relative px-3 pb-2.5 text-center text-[10px] leading-snug text-slate-500">
        {onGround ? (
          "On ground — model frozen."
        ) : (
          <>
            Gold dot = nose · align with{" "}
            <span className="font-mono text-slate-400">{fmtHdg(headingDeg)}°</span> track
            {vsFpm != null && Number.isFinite(vsFpm) ? (
              <>
                {" "}
                · V/S {vsFpm >= 0 ? "+" : ""}
                {Math.round(vsFpm)} fpm
              </>
            ) : null}
          </>
        )}
      </p>
    </div>
  );
}

function fmtHdg(h: number | null) {
  if (h == null || !Number.isFinite(h)) return "—";
  return String(Math.round(((h % 360) + 360) % 360)).padStart(3, "0");
}
