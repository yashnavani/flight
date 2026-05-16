"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { SurfaceWeatherPayload } from "@/lib/surfaceWeatherTypes";

function fmt1(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

function fmt0(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

const anchorLabel = "Your live GPS";

export type SurfaceWeatherGpsMode = "off" | "acquiring" | "fix";

export function SurfaceWeatherStrip({
  mode,
  lat,
  lng,
}: {
  mode: SurfaceWeatherGpsMode;
  lat: number;
  lng: number;
}) {
  const fetchWx = mode === "fix";
  const { qLat, qLng } = useMemo(() => {
    return {
      qLat: Math.round(lat * 100) / 100,
      qLng: Math.round(lng * 100) / 100,
    };
  }, [lat, lng]);

  const q = useQuery({
    queryKey: ["surface-wx-openmeteo", qLat, qLng],
    queryFn: async (): Promise<SurfaceWeatherPayload> => {
      const u = new URLSearchParams({ lat: String(qLat), lng: String(qLng) });
      const r = await fetch(`/api/weather/point?${u}`, { cache: "no-store" });
      const j = (await r.json()) as SurfaceWeatherPayload & { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) throw new Error((j as { error?: string }).error || "weather");
      return j;
    },
    enabled: fetchWx && Number.isFinite(qLat) && Number.isFinite(qLng),
    staleTime: 120_000,
    refetchInterval: 300_000,
    retry: 1,
  });

  const c = q.data?.current;
  const hourly = q.data?.hourly ?? [];

  const nextTemps = useMemo(() => {
    if (!hourly.length) return "";
    return hourly
      .slice(0, 8)
      .map((h) => {
        const hm = h.time.length >= 16 ? h.time.slice(11, 16) : h.time;
        return `${hm} ${fmt0(h.tempC)}°`;
      })
      .join(" · ");
  }, [hourly]);

  return (
    <div className="pointer-events-auto w-full max-w-[min(100%,18rem)] shrink-0 sm:max-w-[min(100%,20rem)]">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="radar-chrome rounded-xl px-2.5 py-2 text-[10px] leading-snug text-slate-200/95 ring-1 ring-violet-400/15 sm:px-3 sm:py-2.5"
      >
        <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-2">
          <span
            className="font-mono text-[9px] font-semibold uppercase tracking-wide text-violet-200/90"
            title="Open-Meteo model grid (surface); not METAR"
          >
            surface wx · {anchorLabel}
          </span>
          {fetchWx && q.data?.timezone && (
            <span className="text-[9px] font-medium text-slate-500">{q.data.timezone}</span>
          )}
        </div>

        {!fetchWx && mode === "off" && (
          <p className="text-[10px] leading-snug text-slate-400/95">
            Tied to your live GPS only. Turn on <span className="font-semibold text-cyan-200/90">Track me</span> in
            the METAR strip (allow location · HTTPS).
          </p>
        )}
        {!fetchWx && mode === "acquiring" && (
          <p className="text-[10px] leading-snug text-slate-400/95">Acquiring GPS fix…</p>
        )}

        {fetchWx && q.isPending && <p className="text-slate-500/95">loading surface wx…</p>}
        {fetchWx && q.isError && <p className="font-medium text-rose-300/95">surface wx unavailable</p>}

        {fetchWx && c && !q.isPending && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-tight text-slate-50/95">
              {fmt1(c.tempC)}°C
              {c.apparentC != null && Number.isFinite(c.apparentC) ? (
                <span className="ml-1 font-normal text-slate-400">feels {fmt1(c.apparentC)}°</span>
              ) : null}
              <span className="ml-1.5 text-[10px] font-medium text-violet-200/85">
                {c.condition ?? "—"}
                {c.isDay === false ? " · night" : ""}
              </span>
            </p>
            <p className="text-[9px] leading-relaxed text-slate-400/95">
              Wind {fmt1(c.windKt)} kt @ {fmt0(c.windDeg)}° · RH {fmt0(c.rhPct)}% · Cloud{" "}
              {fmt0(c.cloudPct)}%
              {c.pressureMslHpa != null ? ` · QNH ~${fmt0(c.pressureMslHpa)} hPa` : ""}
              {c.precipMm != null && c.precipMm > 0 ? ` · Rain ${fmt1(c.precipMm)} mm` : ""}
            </p>
            {nextTemps && (
              <p
                className="hidden font-mono text-[8px] leading-relaxed text-slate-500/95 sm:line-clamp-1 sm:block"
                title={nextTemps}
              >
                Next h: {nextTemps}
              </p>
            )}
            <p className="text-[8px] text-slate-600/90">
              Grid ~{fmt1(q.data?.lat)}°, {fmt1(q.data?.lng)}° · Open-Meteo (CC BY 4.0)
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
