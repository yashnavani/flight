"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SurfaceWeatherStrip } from "@/components/SurfaceWeatherStrip";
import { pickSheetFlair } from "@/lib/loveQuips";
import { getGlobeMapAttribution } from "@/lib/globeTiles";
import { FlightSelectionSheet } from "@/components/FlightSelectionSheet";
import { LovePlaneClickBurst } from "@/components/LovePlaneClickBurst";
import { LoveToastWithHearts } from "@/components/LoveToastWithHearts";
import MetarTicker from "@/components/MetarTicker";
import PrishaWelcomeScreen, {
  WELCOME_SESSION_KEY,
} from "@/components/PrishaWelcomeScreen";
import { useRadarApp } from "@/radar/orchestrator";

const GlobeCanvas = dynamic(() => import("@/components/GlobeCanvas"), {
  ssr: false,
  loading: () => (
    <div className="relative flex h-dvh w-full max-w-[100%] flex-col items-center justify-center overflow-x-hidden overflow-y-hidden bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 text-cyan-200/90">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,rgba(165,243,252,0.45),transparent_58%),radial-gradient(ellipse_at_85%_75%,rgba(251,207,232,0.28),transparent_52%)]" />
      <motion.div
        className="absolute h-48 w-48 rounded-full bg-cyan-300/28 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ type: "tween", duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-[1] flex flex-col items-center gap-4">
        <div className="radar-sweep h-28 w-28 rounded-full border-2 border-cyan-500/40" />
        <motion.p
          className="text-[11px] uppercase tracking-[0.45em] text-slate-400"
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ type: "tween", duration: 1.8, repeat: Infinity }}
        >
          spinning up globe · tiles · traffic
        </motion.p>
      </div>
    </div>
  ),
});

const LeafletRadarMap = dynamic(() => import("@/components/LeafletRadarMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 z-0 flex items-center justify-center bg-slate-900/85 text-[11px] font-medium text-slate-500">
      loading 2D map…
    </div>
  ),
});

const MAP_MODE_SESSION_KEY = "her-radar-map-surface";
type MapSurface = "globe" | "leaflet";

const toastHueClass: Record<
  "rose" | "amber" | "cyan" | "violet",
  string
> = {
  rose: "border-white/10 bg-gradient-to-br from-rose-950/88 via-slate-950/92 to-slate-900/95 ring-1 ring-rose-400/25 shadow-[0_20px_55px_-20px_rgba(244,63,94,0.32)]",
  amber:
    "border-white/10 bg-gradient-to-br from-amber-950/82 via-slate-950/92 to-slate-900/95 ring-1 ring-amber-400/22 shadow-[0_20px_55px_-20px_rgba(251,191,36,0.2)]",
  cyan: "border-white/10 bg-gradient-to-br from-slate-900/92 via-cyan-950/38 to-slate-950/96 ring-1 ring-cyan-400/28 shadow-[0_20px_55px_-20px_rgba(34,211,238,0.18)]",
  violet:
    "border-white/10 bg-gradient-to-br from-violet-950/85 via-slate-950/92 to-slate-900/95 ring-1 ring-violet-400/22 shadow-[0_20px_55px_-20px_rgba(167,139,250,0.22)]",
};

export default function FlightRadarExperience() {
  const app = useRadarApp();
  const [showWelcome, setShowWelcome] = useState(true);
  const [mapSurface, setMapSurface] = useState<MapSurface>("globe");
  const [heartBurstId, setHeartBurstId] = useState(0);
  const skipHeartEffectRef = useRef(false);

  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(WELCOME_SESSION_KEY) === "1") setShowWelcome(false);
    } catch {
      setShowWelcome(false);
    }
  }, []);

  useLayoutEffect(() => {
    try {
      const v = sessionStorage.getItem(MAP_MODE_SESSION_KEY);
      if (v === "globe" || v === "leaflet") setMapSurface(v);
    } catch {
      /* ignore */
    }
  }, []);

  const persistMapSurface = (m: MapSurface) => {
    setMapSurface(m);
    try {
      sessionStorage.setItem(MAP_MODE_SESSION_KEY, m);
    } catch {
      /* ignore */
    }
  };

  const dismissWelcome = () => {
    try {
      sessionStorage.setItem(WELCOME_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowWelcome(false);
  };

  const sheetFlair = useMemo(
    () =>
      app.selection.selectedIcao ? pickSheetFlair(app.selection.selectedIcao) : "",
    [app.selection.selectedIcao],
  );

  const onGlobePickWithHearts = useCallback(
    (a: Parameters<typeof app.onGlobePick>[0]) => {
      if (a) {
        skipHeartEffectRef.current = true;
        setHeartBurstId((n) => n + 1);
      }
      app.onGlobePick(a);
    },
    [app.onGlobePick],
  );

  useEffect(() => {
    if (!app.selection.selectedIcao) {
      skipHeartEffectRef.current = false;
      return;
    }
    if (skipHeartEffectRef.current) {
      skipHeartEffectRef.current = false;
      return;
    }
    setHeartBurstId((n) => n + 1);
  }, [app.selection.selectedIcao]);

  const surfaceWxGps = useMemo(() => {
    const fix = app.lastGeoFix;
    if (app.locatingMe && fix) {
      return { mode: "fix" as const, lat: fix.lat, lng: fix.lng };
    }
    if (app.locatingMe) return { mode: "acquiring" as const };
    return { mode: "off" as const };
  }, [app.locatingMe, app.lastGeoFix?.lat, app.lastGeoFix?.lng]);

  const radarMapProps = useMemo(() => {
    const cap = 4000;
    let aircraft = app.search.displayForGlobe.slice(0, cap);
    let hubEmpty = app.search.displayForGlobe.length === 0;
    /** Empty search: full regional smoothed fleet on both Globe and 2D (viewport slice hid traffic). */
    if (!app.search.search.trim()) {
      aircraft = app.smoothed.slice(0, cap);
      hubEmpty = app.smoothed.length === 0;
    }
    return {
      aircraft,
      watchIcao: app.watch.watchSet,
      selectedIcao: app.selection.selectedIcao,
      trail: app.trail,
      airportLabels: app.airportLabels,
      suppressHubLabels: app.feed.isFetching && hubEmpty,
      onSelect: onGlobePickWithHearts,
      onViewChange: app.view.onViewChange,
      onAirportLabelClick: app.onAirportPick,
      follow: app.follow.follow && !!app.selection.selected,
      followLat: app.selection.selected?.lat ?? null,
      followLng: app.selection.selected?.lng ?? null,
      cameraToken: app.camera.token,
      cameraLat: app.camera.lat,
      cameraLng: app.camera.lng,
      cameraPovAlt: app.camera.alt,
      cameraTransitionMs: app.camera.transitionMs ?? 1600,
    };
  }, [
    app.search.displayForGlobe,
    app.search.search,
    app.smoothed,
    app.watch.watchSet,
    app.selection.selectedIcao,
    app.selection.selected,
    app.trail,
    app.airportLabels,
    app.feed.isFetching,
    onGlobePickWithHearts,
    app.view.onViewChange,
    app.onAirportPick,
    app.follow.follow,
    app.camera.token,
    app.camera.lat,
    app.camera.lng,
    app.camera.alt,
    app.camera.transitionMs,
  ]);

  return (
    <div className="relative h-dvh min-h-0 w-full max-w-[100%] overflow-x-hidden overflow-y-hidden bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 font-sans text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-50">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.07] via-transparent to-slate-900/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_88%_58%_at_50%_-16%,rgba(165,243,252,0.5),transparent_56%),radial-gradient(ellipse_58%_48%_at_100%_6%,rgba(251,207,232,0.32),transparent_50%),radial-gradient(ellipse_52%_58%_at_0%_102%,rgba(125,211,252,0.38),transparent_50%),radial-gradient(ellipse_110%_85%_at_50%_108%,rgba(148,163,184,0.18),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-[20%] top-[5%] h-[65vh] w-[65vw] rounded-full bg-fuchsia-400/28 blur-[110px] opacity-[0.48]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[18%] bottom-[0%] h-[58vh] w-[58vw] rounded-full bg-cyan-300/26 blur-[95px] opacity-[0.42]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[42vh] w-[42vh] -translate-x-1/2 rounded-full bg-sky-300/22 blur-[72px] opacity-[0.37]"
        aria-hidden
      />
      <div className="absolute inset-0 isolate z-0 overflow-hidden">
        {mapSurface === "globe" ? (
          <GlobeCanvas key="globe-surface" {...radarMapProps} />
        ) : (
          <LeafletRadarMap key="leaflet-surface" {...radarMapProps} />
        )}
      </div>

      <LovePlaneClickBurst burstId={heartBurstId} />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[100] pt-2 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pt-3 sm:pl-[max(1.25rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.25rem,env(safe-area-inset-right,0px))]">
        <div className="pointer-events-auto radar-chrome mx-auto flex max-w-[min(100%,92rem)] flex-col rounded-xl px-3 pb-3 pt-2.5 ring-1 ring-cyan-400/12 sm:rounded-2xl sm:px-5 sm:pb-4 sm:pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="min-w-0 overflow-visible pl-0.5 sm:pl-1"
            >
              <span className="inline-block text-[10px] font-medium uppercase tracking-[0.42em] text-cyan-300/90">
                For {app.HER}
              </span>
              <h1
                className="mt-0.5 block cursor-default bg-gradient-to-r from-cyan-200 via-sky-100 to-amber-200 bg-clip-text py-0 text-lg font-semibold tracking-[-0.02em] text-transparent drop-shadow-[0_1px_24px_rgba(34,211,238,0.15)] sm:mt-1 sm:text-[1.35rem] sm:leading-tight"
                onClick={app.gift.onTitleTap}
              >
                Her Flight Radar
              </h1>
              {app.birthday.birthdayDays !== null && (
                <span className="mt-1 block text-[11px] font-medium text-amber-200/85">
                  Birthday runway · {app.birthday.birthdayDays}d
                </span>
              )}
            </motion.div>

            <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2 sm:min-w-[min(100%,20rem)] sm:border-t-0 sm:justify-end sm:pt-0">
              <div className="flex h-9 min-w-[5.75rem] items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-3 tabular-nums ring-1 ring-cyan-500/10">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full shadow-[0_0_10px_currentColor] ${
                    app.feed.isError
                      ? "bg-rose-400 text-rose-400"
                      : app.feed.isLoading
                        ? "animate-pulse bg-amber-400 text-amber-400"
                        : "bg-emerald-400 text-emerald-400"
                  }`}
                />
                <span className="min-w-[3.25rem] text-[11px] font-medium tracking-wide text-slate-200/90">
                  {app.feed.isError ? "Offline" : app.feed.isLoading ? "Syncing" : "Live"}
                </span>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                onClick={() => app.refreshFeed()}
                className="h-9 rounded-xl border border-white/10 bg-slate-900/70 px-3.5 text-[11px] font-semibold text-slate-100 shadow-sm transition-colors duration-200 hover:border-cyan-400/35 hover:bg-slate-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
              >
                Refresh
              </motion.button>
              <div
                className="flex h-9 shrink-0 items-center rounded-xl border border-white/10 bg-slate-950/60 p-0.5 ring-1 ring-white/5"
                role="group"
                aria-label="Map view"
              >
                <button
                  type="button"
                  onClick={() => persistMapSurface("globe")}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                    mapSurface === "globe"
                      ? "bg-cyan-500/25 text-cyan-50 ring-1 ring-cyan-400/35"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Globe
                </button>
                <button
                  type="button"
                  onClick={() => persistMapSurface("leaflet")}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                    mapSurface === "leaflet"
                      ? "bg-cyan-500/25 text-cyan-50 ring-1 ring-cyan-400/35"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  2D
                </button>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                onClick={() => app.search.setPaletteOpen(true)}
                className="h-9 rounded-xl border border-cyan-400/25 bg-cyan-950/35 px-3.5 text-[11px] font-semibold text-cyan-50/95 shadow-sm transition-colors duration-200 hover:border-cyan-300/45 hover:bg-cyan-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45"
              >
                <span className="opacity-80">⌘</span>K
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                onClick={() => {
                  app.toast.pushLove("gift_open");
                  app.gift.setGiftOpen(true);
                }}
                className="h-9 rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 px-3.5 text-[11px] font-bold text-slate-950 shadow-lg shadow-rose-500/25 ring-1 ring-white/15 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
                aria-label="Open gift"
              >
                ✦
              </motion.button>
            </div>
          </div>

          <div className="mt-2 border-t border-white/[0.08] pt-2 sm:mt-2.5 sm:pt-2.5">
            <div className="overflow-hidden rounded-lg bg-slate-950/50 ring-1 ring-white/[0.08] sm:rounded-xl">
              <div className="flex min-h-[2.25rem] divide-x divide-white/[0.06] sm:min-h-[2.5rem]">
                <input
                  ref={app.search.searchRef}
                  value={app.search.search}
                  onChange={(e) => app.search.setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") app.search.flyToFirstMatch();
                  }}
                  autoComplete="off"
                  placeholder="Search callsign, tail reg, or ICAO24 hex…"
                  className="min-h-[2.25rem] min-w-0 flex-1 border-0 bg-transparent py-1.5 pl-3 pr-2 text-[12px] leading-tight text-slate-100 outline-none placeholder:text-slate-500/90 sm:min-h-[2.5rem] sm:py-2 sm:pl-4 sm:pr-3 sm:text-[13px]"
                />
                <button
                  type="button"
                  onClick={app.search.flyToFirstMatch}
                  className="flex min-h-[2.25rem] shrink-0 items-center px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/95 transition hover:bg-cyan-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/40 sm:min-h-[2.5rem] sm:px-5 sm:text-[11px]"
                >
                  Fly
                </button>
              </div>
            </div>
            {app.search.search.trim() && (
              <p className="mt-1.5 text-[10px] font-medium leading-snug text-slate-400/95 sm:mt-2 sm:text-[11px]">
                {app.smoothed.length === 0 ? (
                  <>No traffic in this map feed — zoom out or hit Refresh.</>
                ) : (
                  <>
                    {app.search.filtered.length} hit · {app.smoothed.length} in regional feed
                    {app.search.filtered.length === 0 ? " — try part of hex, callsign, or reg" : ""}
                  </>
                )}
              </p>
            )}
          </div>

          <div className="mt-2 flex w-full flex-col items-stretch gap-2 sm:mt-2.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-end sm:gap-2.5">
            <SurfaceWeatherStrip
              mode={surfaceWxGps.mode}
              lat={surfaceWxGps.mode === "fix" ? surfaceWxGps.lat : 0}
              lng={surfaceWxGps.mode === "fix" ? surfaceWxGps.lng : 0}
            />
            <MetarTicker
              icao={app.metar.activeMetarIcao}
              onBubbleTap={app.onMetarBubbleTap}
              locatingMe={app.locatingMe}
              lastGeoFix={app.lastGeoFix}
              onIcaoLocateToggle={app.toggleLocateMe}
            />
          </div>
        </div>
      </header>

      {app.watch.watchedHere.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-auto absolute bottom-28 left-4 right-4 z-[100] flex flex-wrap gap-2 sm:bottom-32"
        >
          {app.watch.watchedHere.slice(0, 6).map((a) => (
            <button
              key={a.icao24}
              type="button"
              onClick={() => app.flyToAircraft(a)}
              className="h-8 rounded-xl border border-amber-400/25 bg-slate-950/75 px-3 text-[11px] font-medium text-amber-100/95 shadow-sm ring-1 ring-white/5 backdrop-blur-md transition hover:border-amber-400/40 hover:bg-amber-500/10"
            >
              ★ {a.callsign?.trim() || a.icao24}
            </button>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {app.selection.selectedIcao && (
          <motion.aside
            key={app.selection.selectedIcao}
            initial={{ y: 120, opacity: 0, rotate: -0.6 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 120, opacity: 0, rotate: 0.4 }}
            transition={{ type: "spring", stiffness: 260, damping: 34, mass: 0.85 }}
            className="pointer-events-auto absolute bottom-0 left-0 right-0 z-[110] border-t border-white/[0.08] bg-slate-950/88 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:left-4 sm:right-4 sm:mx-auto sm:max-w-2xl sm:rounded-t-3xl sm:ring-1 sm:ring-white/10"
          >
            {!app.selection.selected ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-400">
                  Waiting for{" "}
                  <span className="font-mono text-cyan-200/95">{app.selection.selectedIcao}</span>…
                </p>
                <button
                  type="button"
                  onClick={app.clearSheet}
                  className="h-9 rounded-xl bg-slate-800/90 px-3.5 text-[11px] font-semibold text-slate-200 ring-1 ring-white/10 transition hover:bg-slate-700/90"
                >
                  Close
                </button>
              </div>
            ) : (
              <FlightSelectionSheet
                selected={app.selection.selected}
                flightQuery={app.flightContext}
                follow={app.follow.follow}
                watched={app.watch.watchSet.has(app.selection.selected.icao24)}
                sheetFlair={sheetFlair}
                onToggleFollow={() => app.toggleFollow()}
                onToggleWatch={() => app.toggleWatchForSelection()}
                onClose={app.clearSheet}
              />
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {app.feed.isError && (
        <div className="pointer-events-auto absolute bottom-40 left-4 right-4 z-[100] radar-chrome rounded-2xl px-4 py-3 text-center text-[12px] font-medium leading-snug text-rose-100/95 ring-1 ring-rose-400/20 sm:left-auto sm:right-6 sm:max-w-sm">
          {app.feed.error instanceof Error ? app.feed.error.message : "Network/API hiccup — retry?"}{" "}
          <button
            type="button"
            className="ml-1 font-semibold text-cyan-200 underline decoration-cyan-400/50 underline-offset-2 transition hover:text-cyan-100"
            onClick={() => app.refreshFeed()}
          >
            Retry
          </button>
        </div>
      )}

      <AnimatePresence>
        {app.gift.giftOpen && (
          <motion.div
            className="pointer-events-auto fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/75 p-6 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => app.gift.setGiftOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/98 to-slate-950 p-8 text-center shadow-[0_32px_80px_-24px_rgba(0,0,0,0.75)] ring-1 ring-cyan-400/15"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.42em] text-cyan-300/90">VIP brief</p>
              <p className="mt-5 text-lg font-medium leading-relaxed text-slate-100">
                Cleared as filed: you, me, and every silly METAR we decode over chai. RNAV to
                forever — no alternate required when you&apos;re PIC of my heart.
              </p>
              <p className="mt-4 text-[13px] leading-relaxed text-slate-400">
                Psst: triple-tap the title for secret NOTAM (same energy as a hidden transponder
                code).
              </p>
              <button
                type="button"
                className="mt-9 h-10 w-full max-w-[220px] rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 text-[13px] font-bold text-slate-950 shadow-lg shadow-cyan-500/25 ring-1 ring-white/20 transition hover:brightness-105"
                onClick={() => app.gift.setGiftOpen(false)}
              >
                Fly on
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {app.search.paletteOpen && (
          <motion.div
            className="pointer-events-auto fixed inset-0 z-[190] flex items-start justify-center bg-slate-950/65 p-4 pt-24 backdrop-blur-lg sm:pt-28"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => app.search.setPaletteOpen(false)}
          >
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-[0_28px_80px_-28px_rgba(0,0,0,0.65)] ring-1 ring-cyan-400/12"
            >
              <div className="border-b border-white/[0.06] bg-slate-900/50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Command radar · search
              </div>
              <input
                value={app.search.search}
                onChange={(e) => app.search.setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && app.search.filtered[0]) {
                    app.flyToAircraft(app.search.filtered[0]);
                    app.search.setPaletteOpen(false);
                  }
                }}
                className="w-full border-0 bg-transparent px-4 py-3.5 text-[13px] text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="Type callsign / ICAO24…"
              />
              <ul className="max-h-56 overflow-auto border-t border-white/[0.06]">
                {app.search.filtered.slice(0, 12).map((a) => (
                  <li key={a.icao24}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] transition hover:bg-slate-800/80"
                      onClick={() => {
                        app.flyToAircraft(a);
                        app.search.setPaletteOpen(false);
                      }}
                    >
                      <span className="font-semibold text-slate-50">{a.callsign?.trim() || "—"}</span>
                      <span className="font-mono text-[11px] text-slate-500">{a.icao24}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-[180] flex justify-between gap-3 px-3 sm:bottom-24 sm:px-5">
        <div className="flex w-[min(48vw,340px)] flex-col items-start gap-2 overflow-visible">
          <AnimatePresence>
            {app.toast.toasts
              .filter((t) => t.side === "left")
              .map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 16, x: -12, scale: 0.9, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, y: 8, x: -8, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                  className={`toast-wiggle pointer-events-auto max-w-[min(48vw,340px)] overflow-visible rounded-2xl px-3 py-2.5 text-left backdrop-blur-xl ${toastHueClass[t.hue]}`}
                >
                  <LoveToastWithHearts>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-white/92">
                      {t.tag}
                    </p>
                    <p className="mt-1 text-[12px] font-medium leading-snug text-slate-50/95">{t.line}</p>
                  </LoveToastWithHearts>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
        <div className="flex w-[min(48vw,340px)] flex-col items-end gap-2 overflow-visible">
          <AnimatePresence>
            {app.toast.toasts
              .filter((t) => t.side === "right")
              .map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 16, x: 12, scale: 0.9, rotate: 2 }}
                  animate={{ opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, y: 8, x: 8, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                  className={`toast-wiggle pointer-events-auto max-w-[min(48vw,340px)] overflow-visible rounded-2xl px-3 py-2.5 text-left backdrop-blur-xl ${toastHueClass[t.hue]}`}
                >
                  <LoveToastWithHearts>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-white/92">
                      {t.tag}
                    </p>
                    <p className="mt-1 text-[12px] font-medium leading-snug text-slate-50/95">{t.line}</p>
                  </LoveToastWithHearts>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-2 left-0 right-0 z-[90] px-4 text-center text-[10px] font-medium leading-snug text-slate-500/90">
        Live positions via{" "}
        <a
          className="text-cyan-300/90 underline decoration-cyan-500/40 underline-offset-2"
          href="https://adsb.lol"
          target="_blank"
          rel="noreferrer"
        >
          ADSB.lol
        </a>{" "}
        (ODbL) · Not for navigation · {getGlobeMapAttribution()}
        {mapSurface === "leaflet" ? (
          <>
            {" "}
            ·{" "}
            <a
              className="text-cyan-300/90 underline decoration-cyan-500/40 underline-offset-2"
              href="https://leafletjs.com/"
              target="_blank"
              rel="noreferrer"
            >
              Leaflet
            </a>
          </>
        ) : null}
      </p>

      {showWelcome && <PrishaWelcomeScreen onEnter={dismissWelcome} />}
    </div>
  );
}
