"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import type { MajorAirport } from "@/data/majorAirports";
import type { Aircraft } from "@/lib/opensky";
import { aircraftToPoint } from "@/lib/opensky";
import { createAircraftModel } from "@/lib/globeAircraftModel";
import { globeBasemapIsSatellite, resolveGlobeTileUrl } from "@/lib/globeTiles";
import { getDefaultHomePov } from "@/radar/constants";

type GlobeAc = ReturnType<typeof aircraftToPoint>;

type Props = {
  aircraft: Aircraft[];
  watchIcao: Set<string>;
  selectedIcao: string | null;
  trail: [number, number][];
  airportLabels: MajorAirport[];
  /** While true, no hub ICAO sprites (avoids huge VABB on empty map during refetch). */
  suppressHubLabels?: boolean;
  onSelect: (a: Aircraft | null) => void;
  onViewChange: (lat: number, lng: number, altitude: number) => void;
  onAirportLabelClick?: (icao: string) => void;
  follow: boolean;
  followLat: number | null;
  followLng: number | null;
  cameraToken: number;
  cameraLat: number;
  cameraLng: number;
  cameraPovAlt: number;
  cameraTransitionMs?: number;
};

export default function GlobeCanvas({
  aircraft,
  watchIcao,
  selectedIcao,
  trail,
  airportLabels,
  suppressHubLabels = false,
  onSelect,
  onViewChange,
  onAirportLabelClick,
  follow,
  followLat,
  followLng,
  cameraToken,
  cameraLat,
  cameraLng,
  cameraPovAlt,
  cameraTransitionMs = 1600,
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const didHomePov = useRef(false);
  const didLights = useRef(false);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [camAlt, setCamAlt] = useState(() => getDefaultHomePov().altitude);

  const reportView = useCallback(
    (lat: number, lng: number, altitude: number) => {
      setCamAlt(altitude);
      onViewChange(lat, lng, altitude);
    },
    [onViewChange],
  );

  const onGlobeReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;

    if (!didLights.current) {
      didLights.current = true;
      const sat = globeBasemapIsSatellite();
      const amb = new THREE.AmbientLight(sat ? 0x8a9eb8 : 0xd8e8ff, sat ? 0.38 : 0.62);
      const key = new THREE.DirectionalLight(sat ? 0xfff5e8 : 0xffffff, sat ? 1.35 : 1.12);
      key.position.set(2.4, 1.2, 0.9);
      const fill = new THREE.DirectionalLight(sat ? 0x6b8cae : 0x7dd3fc, sat ? 0.22 : 0.48);
      fill.position.set(-1.9, -0.4, -1.1);
      const rim = new THREE.DirectionalLight(sat ? 0xc4b5fd : 0xf5d0fe, sat ? 0.14 : 0.28);
      rim.position.set(0.1, -1.4, 1.8);
      g.lights([amb, key, fill, rim]);

      const r = g.renderer();
      r.setPixelRatio(Math.min(2.25, typeof window !== "undefined" ? window.devicePixelRatio : 1));
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = sat ? 0.96 : 1.12;
    }

    if (didHomePov.current) return;
    didHomePov.current = true;
    requestAnimationFrame(() => {
      const gg = globeRef.current;
      if (!gg) return;
      const h = getDefaultHomePov();
      gg.pointOfView({ lat: h.lat, lng: h.lng, altitude: h.altitude }, 0);
      reportView(h.lat, h.lng, h.altitude);
    });
  }, [reportView]);

  useEffect(() => {
    const ro = () =>
      setDims({
        w: Math.max(320, window.innerWidth),
        h: Math.max(320, window.innerHeight),
      });
    ro();
    window.addEventListener("resize", ro);
    return () => window.removeEventListener("resize", ro);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const g = globeRef.current;
      if (!g) return;
      const pov = g.pointOfView();
      reportView(pov.lat, pov.lng, pov.altitude);
    }, 1800);
    return () => window.clearInterval(id);
  }, [reportView]);

  useEffect(() => {
    if (!follow || followLat == null || followLng == null) return;
    globeRef.current?.pointOfView({ lat: followLat, lng: followLng, altitude: 0.34 }, 750);
    const id = window.setTimeout(() => {
      const g = globeRef.current;
      if (g) setCamAlt(g.pointOfView().altitude);
    }, 780);
    return () => window.clearTimeout(id);
  }, [follow, followLat, followLng]);

  useEffect(() => {
    if (!cameraToken) return;
    globeRef.current?.pointOfView(
      { lat: cameraLat, lng: cameraLng, altitude: cameraPovAlt },
      cameraTransitionMs,
    );
    const id = window.setTimeout(() => {
      const g = globeRef.current;
      if (g) setCamAlt(g.pointOfView().altitude);
    }, cameraTransitionMs + 80);
    return () => window.clearTimeout(id);
  }, [cameraToken, cameraLat, cameraLng, cameraPovAlt, cameraTransitionMs]);

  const camAltBucket = useMemo(() => Math.round(camAlt * 44) / 44, [camAlt]);

  const objectMarkers: GlobeAc[] = useMemo(
    () =>
      aircraft.map((a) =>
        aircraftToPoint(
          a,
          a.icao24 === selectedIcao,
          watchIcao.has(a.icao24),
          camAltBucket,
        ),
      ),
    [aircraft, selectedIcao, watchIcao, camAltBucket],
  );

  const objectThreeObject = useCallback((d: object) => {
    const ac = d as GlobeAc;
    return createAircraftModel(ac.color, ac.markerScale);
  }, []);

  const objectRotation = useCallback((d: object) => {
    const ac = d as GlobeAc;
    const h = ac.heading;
    const deg = h != null && Number.isFinite(h) ? h : 0;
    return { x: 8, y: 0, z: -deg };
  }, []);

  const ringsData = useMemo(
    () =>
      aircraft
        .filter((a) => watchIcao.has(a.icao24))
        .map((a) => ({
          lat: a.lat,
          lng: a.lng,
        })),
    [aircraft, watchIcao],
  );

  const labelsData = useMemo(
    () =>
      suppressHubLabels
        ? []
        : airportLabels.map((ap) => ({
            lat: ap.lat,
            lng: ap.lng,
            text: ap.icao,
            icao: ap.icao,
            name: ap.name,
            alt: 0.005,
            color: "rgba(226,232,240,0.92)",
          })),
    [airportLabels, suppressHubLabels],
  );

  const hubLabelSize = useCallback((_d: object) => {
    const z = Math.max(0.09, camAltBucket);
    return Math.min(0.22, 0.048 + z * 0.26);
  }, [camAltBucket]);

  const pathsData = useMemo(() => {
    if (trail.length < 2) return [];
    return [trail];
  }, [trail]);

  const handleObjectClick = useCallback(
    (obj: object) => {
      const ac = obj as Aircraft;
      if (ac?.icao24) onSelect(ac);
    },
    [onSelect],
  );

  const handleLabelClick = useCallback(
    (label: object) => {
      const icao = (label as { icao?: string }).icao;
      if (icao && onAirportLabelClick) onAirportLabelClick(icao);
    },
    [onAirportLabelClick],
  );

  const objectLabel = useCallback((d: object) => {
    const a = d as Aircraft;
    const cs = a.callsign ?? a.icao24;
    return `<div style="padding:4px 8px;background:rgba(2,6,23,0.9);border:1px solid rgba(251,191,36,0.42);border-radius:6px;font:12px system-ui;color:#f1f5f9">${cs}</div>`;
  }, []);

  const tileUrl = useCallback(resolveGlobeTileUrl, []);

  const sat = globeBasemapIsSatellite();

  return (
    <div className="absolute inset-0 z-0">
      <div
        className={
          sat
            ? "pointer-events-none absolute inset-0 z-[2] opacity-[0.42] shadow-[inset_0_0_140px_rgba(0,0,0,0.72),inset_0_0_48px_rgba(15,23,42,0.35)]"
            : "pointer-events-none absolute inset-0 z-[2] opacity-80 shadow-[inset_0_0_90px_rgba(15,23,42,0.28),inset_0_0_36px_rgba(56,189,248,0.14)]"
        }
        aria-hidden
      />
      <div
        className={
          sat
            ? "pointer-events-none absolute inset-0 z-[3] mix-blend-overlay opacity-[0.022]"
            : "pointer-events-none absolute inset-0 z-[3] mix-blend-soft-light opacity-[0.05]"
        }
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <Globe
        ref={globeRef}
        onGlobeReady={onGlobeReady}
        width={dims.w}
        height={dims.h}
        backgroundColor={sat ? "rgb(2,6,23)" : "rgba(248,250,252,0.03)"}
        globeImageUrl={undefined}
        bumpImageUrl={undefined}
        globeTileEngineUrl={tileUrl}
        {...{ globeTileEngineMaxLevel: sat ? 20 : 20 }}
        globeCurvatureResolution={sat ? 5 : 2}
        showGraticules={false}
        showAtmosphere
        atmosphereColor={sat ? "#7ea8cc" : "#bae6fd"}
        atmosphereAltitude={sat ? 0.28 : 0.34}
        objectsData={objectMarkers}
        objectLat="lat"
        objectLng="lng"
        objectAltitude="altUnit"
        objectRotation={objectRotation}
        objectThreeObject={objectThreeObject}
        objectLabel={objectLabel}
        onObjectClick={handleObjectClick}
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringAltitude={0.001}
        ringColor={() => ["rgba(216,180,254,0.65)", "rgba(192,132,252,0.08)"]}
        ringMaxRadius={4.2}
        ringPropagationSpeed={3.6}
        ringRepeatPeriod={4200}
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelAltitude="alt"
        labelSize={hubLabelSize}
        labelColor="color"
        labelDotRadius={0.14}
        labelsTransitionDuration={180}
        labelIncludeDot
        onLabelClick={onAirportLabelClick ? handleLabelClick : undefined}
        pathsData={pathsData}
        pathColor={() => "rgba(253,224,138,0.72)"}
        pathStroke={0.48}
        pathDashLength={0.02}
        pathDashGap={0.014}
        pathDashAnimateTime={0}
        onGlobeClick={() => onSelect(null)}
        onZoom={(pov) => reportView(pov.lat, pov.lng, pov.altitude)}
      />
    </div>
  );
}
