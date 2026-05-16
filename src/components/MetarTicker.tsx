"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function MetarTicker({
  icao,
  onBubbleTap,
  locatingMe,
  lastGeoFix,
  onIcaoLocateToggle,
}: {
  icao: string;
  onBubbleTap?: () => void;
  locatingMe?: boolean;
  /** Browser fix while GPS tracking (for HUD). */
  lastGeoFix?: { lat: number; lng: number; accuracyM: number | null } | null;
  onIcaoLocateToggle?: () => void;
}) {
  const q = useQuery({
    queryKey: ["metar", icao],
    queryFn: async () => {
      const r = await fetch(`/api/metar?ids=${encodeURIComponent(icao)}`, { cache: "no-store" });
      const j = (await r.json()) as {
        ok?: boolean;
        raw?: string | null;
        flightCategory?: string | null;
        error?: string;
      };
      if (!r.ok || !j.ok) throw new Error(j.error || "METAR");
      return j;
    },
    refetchInterval: 180_000,
    retry: 1,
  });

  const raw = q.data?.raw;
  const fc = q.data?.flightCategory;
  const fcColor =
    fc === "VFR"
      ? "text-emerald-300"
      : fc === "MVFR"
        ? "text-amber-300"
        : fc === "IFR" || fc === "LIFR"
          ? "text-rose-300"
          : "text-slate-300";

  return (
    <div className="pointer-events-auto w-full max-w-[min(100%,18rem)] shrink-0 sm:max-w-[min(100%,20rem)]">
      <motion.div
        role="group"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="radar-chrome rounded-xl px-2.5 py-2 text-[10px] leading-snug text-slate-200/95 outline-none ring-1 ring-cyan-400/12 transition hover:ring-cyan-400/22 sm:px-3 sm:py-2.5"
      >
        <div className="mb-1 flex flex-col gap-1.5 sm:mb-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-2 sm:gap-y-1">
          <span
            className="min-w-0 shrink font-mono text-[9px] font-semibold uppercase tracking-wide text-cyan-200/90"
            title="METAR station ICAO (weather for this airport)"
          >
            wx · {icao}
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {fc && <span className={`text-[9px] font-semibold uppercase ${fcColor}`}>{fc}</span>}
            {onIcaoLocateToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIcaoLocateToggle();
                }}
                title={
                  locatingMe
                    ? "Stop: camera was following your GPS position"
                    : "Camera follows your position — use outside, allow location, HTTPS required"
                }
                className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide outline-none transition hover:bg-cyan-500/15 focus-visible:ring-2 focus-visible:ring-cyan-400/45 ${
                  locatingMe
                    ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/45"
                    : "bg-slate-800/80 text-cyan-100/95 ring-1 ring-white/10"
                }`}
              >
                {locatingMe ? "GPS on" : "Track me"}
              </button>
            )}
          </div>
        </div>
        {locatingMe && lastGeoFix && (
          <p className="mb-1 font-mono text-[8px] leading-relaxed text-slate-500" title="WGS84 from browser; accuracy is horizontal only">
            You ≈ {lastGeoFix.lat.toFixed(5)}, {lastGeoFix.lng.toFixed(5)}
            {lastGeoFix.accuracyM != null ? ` · ±${Math.round(lastGeoFix.accuracyM)} m` : ""}
          </p>
        )}
        {locatingMe && !lastGeoFix && (
          <p className="mb-1 text-[8px] text-slate-500">Acquiring GPS fix…</p>
        )}
        <motion.div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onBubbleTap?.();
            }
          }}
          onClick={() => onBubbleTap?.()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97, rotate: -0.6 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          className="cursor-pointer rounded-lg px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/35"
        >
          {q.isPending && <span className="text-slate-500/95">loading wx…</span>}
          {q.isError && <span className="font-medium text-rose-300/95">wx quiet</span>}
          {raw && (
            <p className="line-clamp-2 font-mono text-[9px] leading-relaxed text-slate-300/95" title={raw}>
              {raw}
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
