"use client";

import { motion } from "framer-motion";
import type { UseQueryResult } from "@tanstack/react-query";
import { Stat } from "@/components/FlightStat";
import { FlightSheetLivePreview } from "@/components/FlightSheetLivePreview";
import { majorAirportByIcao, nearestMajorAirportsForPosition } from "@/data/majorAirports";
import { describeAdsbCategory, describePositionSource } from "@/lib/adsbCategory";
import {
  fmtClockAge,
  fmtFixed,
  fmtInt,
  fmtUtcTime,
  metersPerSecToFpm,
  metersPerSecToKnots,
  metersToFeet,
} from "@/lib/aviationFormat";
import { airlineNameFromCallsign, icaoAirlineDesignator } from "@/lib/icaoAirline";
import type { Aircraft } from "@/lib/opensky";
import type { OpenSkyFlightContextResponse } from "@/lib/openskyFlightContext";

function airportLine(icao: string | null) {
  if (!icao) return "—";
  const m = majorAirportByIcao(icao);
  return m ? `${icao} · ${m.name}` : icao;
}

export function FlightSelectionSheet({
  selected,
  flightQuery,
  follow,
  watched,
  sheetFlair,
  onToggleFollow,
  onToggleWatch,
  onClose,
}: {
  selected: Aircraft;
  flightQuery: UseQueryResult<OpenSkyFlightContextResponse, Error>;
  follow: boolean;
  watched: boolean;
  sheetFlair: string;
  onToggleFollow: () => void;
  onToggleWatch: () => void;
  onClose: () => void;
}) {
  const nowSec = Math.floor(Date.now() / 1000);
  const airline = airlineNameFromCallsign(selected.callsign);
  const designator = icaoAirlineDesignator(selected.callsign);
  const fc = flightQuery.data?.flight ?? null;
  const reg = selected.registration ?? fc?.registration ?? null;
  const typ = selected.icaoType ?? fc?.typeCode ?? null;
  const depIcao = fc?.estDepartureAirport?.trim() || null;
  const arrIcao = fc?.estArrivalAirport?.trim() || null;
  const hasBothEnds = Boolean(depIcao && arrIcao);
  const hasAirportPair = Boolean(depIcao || arrIcao);
  /** Live bbox row already carries r/t — do not block strip on v2/hex round-trip. */
  const hasLiveStrip = Boolean(selected.registration || selected.icaoType);
  const stripBlockingPending = flightQuery.isPending && !hasLiveStrip;

  const nearHubs =
    selected.lat != null && selected.lng != null
      ? nearestMajorAirportsForPosition(selected.lat, selected.lng, 4, 1400)
      : [];

  const filedFrom =
    fc?.estDepartureAirport != null && fc.estDepartureAirport.length > 0
      ? airportLine(fc.estDepartureAirport)
      : "No origin in ADS-B strip or OpenSky 2h flight window.";
  const filedTo =
    fc?.estArrivalAirport != null && fc.estArrivalAirport.length > 0
      ? airportLine(fc.estArrivalAirport)
      : "No destination in ADS-B strip or OpenSky 2h flight window.";

  const baroFt = metersToFeet(selected.baroAltitude);
  const geoFt = metersToFeet(selected.geoAltitude);
  const gsKt = metersPerSecToKnots(selected.velocity);
  const vsFpm = metersPerSecToFpm(selected.verticalRate);
  const catLabel =
    selected.emitterCategoryStr ?? describeAdsbCategory(selected.category) ?? "—";
  const posSrc = describePositionSource(selected.positionSource);

  const stats: { label: string; v: string }[] = [
    { label: "Baro alt ft", v: fmtInt(baroFt) },
    { label: "Geo alt ft", v: fmtInt(geoFt) },
    { label: "Ground kt", v: fmtFixed(gsKt, 0) },
    { label: "Track °T", v: fmtFixed(selected.heading, 0) },
    { label: "V/S fpm", v: fmtInt(vsFpm) },
    { label: "Squawk", v: selected.squawk ?? "—" },
    { label: "Emitter class", v: catLabel },
    { label: "Pos source", v: posSrc ?? "—" },
    { label: "SPI", v: selected.spi ? "Yes" : "No" },
    {
      label: "Lat / Lon",
      v:
        selected.lat != null && selected.lng != null
          ? `${fmtFixed(selected.lat, 4)} / ${fmtFixed(selected.lng, 4)}`
          : "—",
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="order-2 min-w-0 flex-1 space-y-3 sm:order-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/75">
              {selected.originCountry}
            </p>
            {designator && (
              <span className="rounded-md bg-slate-800/90 px-2 py-0.5 font-mono text-[10px] text-slate-400 ring-1 ring-white/10">
                {designator}
              </span>
            )}
          </div>
          {airline && (
            <p className="mt-1 text-[13px] font-semibold tracking-tight text-slate-100">{airline}</p>
          )}
          {!airline && designator && (
            <p className="mt-1 text-[12px] text-slate-400">ICAO airline designator · {designator}</p>
          )}
          <h2 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {selected.callsign?.trim() || "—"}
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-slate-400">
            ICAO24 {selected.icao24}
            {selected.onGround ? " · on ground" : ""}
          </p>

          <div className="mt-3 space-y-2 rounded-xl border border-white/[0.06] bg-slate-900/40 px-3 py-2.5 ring-1 ring-white/[0.04]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Route (ADS-B / OpenSky estimates)
            </p>
            {stripBlockingPending && (
              <p className="pt-0.5 text-[12px] text-slate-400">Loading aircraft strip…</p>
            )}
            {flightQuery.isError && (
              <p className="text-[12px] text-rose-300/90">Detail lookup failed — {flightQuery.error.message}</p>
            )}
            {!flightQuery.isError && (
              <>
                {hasBothEnds && (
                  <div className="rounded-lg border border-cyan-500/20 bg-slate-950/50 px-2.5 py-2 ring-1 ring-cyan-400/10">
                    <p className="text-[9px] font-medium uppercase tracking-wider text-cyan-200/70">Estimated O/D</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-base font-bold tracking-tight text-white sm:text-lg">
                      <span>{depIcao}</span>
                      <span className="text-cyan-300/90" aria-hidden>
                        →
                      </span>
                      <span>{arrIcao}</span>
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-slate-400">
                      {airportLine(depIcao)} → {airportLine(arrIcao)}
                    </p>
                  </div>
                )}
                {!hasBothEnds && (
                  <div className="space-y-1 text-[12px] leading-snug text-slate-200/95">
                    <p>
                      <span className="text-slate-500">From</span>{" "}
                      <span className="font-medium text-slate-100">{filedFrom}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">To</span>{" "}
                      <span className="font-medium text-slate-100">{filedTo}</span>
                    </p>
                  </div>
                )}
                <p className="text-[10px] leading-relaxed text-slate-500">
                  Not official filed plans. Strip fields vary by feeder; gaps filled from{" "}
                  <a
                    href="https://opensky-network.org/about/faq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400/90 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-300"
                  >
                    OpenSky
                  </a>{" "}
                  recent flights when possible.{" "}
                  <a
                    href="https://www.openaip.net/?utm_source=her-flight-radar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-300/90 underline decoration-violet-500/40 underline-offset-2 hover:text-violet-200"
                  >
                    OpenAIP
                  </a>{" "}
                  — charts and AIP data (no live origin/destination API here).
                </p>
                {nearHubs.length > 0 && (
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Nearest hubs in this app&apos;s shortlist (great-circle from fix — not filed OD):{" "}
                    {nearHubs
                      .map(({ ap, nm }) => `${ap.icao} · ${ap.name} ~${nm < 15 ? nm.toFixed(1) : Math.round(nm)} nm`)
                      .join(" · ")}
                  </p>
                )}
                {(reg || typ) && (
                  <div className="mt-2 space-y-1 border-t border-white/[0.06] pt-2 text-[12px] leading-snug text-slate-200/95">
                    {reg && (
                      <p>
                        <span className="text-slate-500">Reg</span>{" "}
                        <span className="font-mono font-medium text-slate-100">{reg}</span>
                      </p>
                    )}
                    {typ && (
                      <p>
                        <span className="text-slate-500">ICAO type</span>{" "}
                        <span className="font-mono font-medium text-slate-100">{typ}</span>
                      </p>
                    )}
                  </div>
                )}
                {flightQuery.isFetched && !(reg || typ) && (
                  <p className="mt-2 text-[12px] leading-snug text-slate-400">
                    No registration / type in v2/hex right now (MLAT-only / anonymized / sparse).
                  </p>
                )}
              </>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-slate-900/35 px-3 py-2 ring-1 ring-white/[0.04]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Position time</p>
              <p className="mt-0.5 font-mono text-[12px] text-cyan-100/95">{fmtUtcTime(selected.timePosition)} UTC</p>
              <p className="text-[10px] text-slate-500">
                age {fmtClockAge(selected.timePosition, nowSec)} · last msg {fmtUtcTime(selected.lastContact)} UTC
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-slate-900/35 px-3 py-2 ring-1 ring-white/[0.04]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Registration / type</p>
              <p className="mt-0.5 text-[12px] leading-snug text-slate-300">
                {reg || typ ? (
                  <>
                    {reg && (
                      <>
                        Reg <span className="font-mono text-slate-100">{reg}</span>
                        {typ ? " · " : ""}
                      </>
                    )}
                    {typ && (
                      <>
                        Type <span className="font-mono text-slate-100">{typ}</span>
                      </>
                    )}
                    <span className="mt-1 block text-[10px] text-slate-500">When missing, tail may be MLAT / blocked.</span>
                  </>
                ) : (
                  <>
                    Tail / type often come from the same ADS-B message; this row had no{" "}
                    <span className="font-mono text-slate-400">r</span>/<span className="font-mono text-slate-400">t</span>{" "}
                    fields.
                  </>
                )}
              </p>
            </div>
            {fc && (fc.firstSeen != null || fc.lastSeen != null) && hasAirportPair && (
              <div className="rounded-xl border border-white/[0.06] bg-slate-900/35 px-3 py-2 ring-1 ring-white/[0.04] sm:col-span-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Segment times (when available)
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  firstSeen {fmtUtcTime(fc.firstSeen)} UTC · lastSeen {fmtUtcTime(fc.lastSeen)} UTC
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="order-1 flex w-full flex-col items-stretch gap-3 sm:order-2 sm:w-[14.5rem] sm:shrink-0 sm:items-end">
          <FlightSheetLivePreview
            headingDeg={selected.heading}
            verticalRateMps={selected.verticalRate}
            onGround={selected.onGround}
            watched={watched}
            follow={follow}
          />
          <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onToggleFollow}
              className={`h-9 rounded-xl px-3.5 text-[11px] font-semibold transition-colors ${
                follow
                  ? "bg-cyan-500/20 text-cyan-50 ring-1 ring-cyan-400/45"
                  : "bg-slate-800/90 text-slate-200 ring-1 ring-white/10 hover:bg-slate-700/90"
              }`}
            >
              {follow ? "Following" : "Follow"}
            </button>
            <button
              type="button"
              onClick={onToggleWatch}
              className={`h-9 rounded-xl px-3.5 text-[11px] font-semibold transition-colors ${
                watched
                  ? "bg-amber-400/15 text-amber-100 ring-1 ring-amber-400/35"
                  : "bg-slate-800/90 text-slate-200 ring-1 ring-white/10 hover:bg-slate-700/90"
              }`}
            >
              {watched ? "★ Watched" : "☆ Watch"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-xl bg-slate-800/90 px-3.5 text-[11px] font-semibold text-slate-200 ring-1 ring-white/10 transition hover:bg-slate-700/90"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.04 + i * 0.03, type: "spring", stiffness: 380, damping: 24 }}
          >
            <Stat label={s.label} v={s.v} />
          </motion.div>
        ))}
      </div>

      {selected.onGround && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-emerald-300/90">
          On ground · surface position reports
        </motion.p>
      )}

      {sheetFlair ? (
        <p className="mt-3 text-[11px] font-bold leading-relaxed text-slate-200/95">{sheetFlair}</p>
      ) : null}
    </>
  );
}
