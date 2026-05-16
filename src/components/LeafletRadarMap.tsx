"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MajorAirport } from "@/data/majorAirports";
import { getLeafletTileLayerConfig } from "@/lib/globeTiles";
import { aircraftPlaneDivIcon } from "@/lib/leafletAircraftIcon";
import { metersToFeet } from "@/lib/aviationFormat";
import { globeAltitudeToLeafletZoom, leafletZoomToGlobeCameraAltitude } from "@/lib/leafletViewSync";
import type { Aircraft } from "@/lib/opensky";
import { getDefaultHomePov } from "@/radar/constants";

function acMarkerColor(a: Aircraft): string {
  if (a.onGround) return "#94a3b8";
  const ft = metersToFeet(a.baroAltitude) ?? 0;
  const t = Math.max(0, Math.min(1, ft / 42_000));
  const r = Math.round(249 + (124 - 249) * t);
  const g = Math.round(115 + (58 - 115) * t);
  const b = Math.round(22 + (237 - 22) * t);
  return `rgb(${r},${g},${b})`;
}

type Props = {
  aircraft: Aircraft[];
  watchIcao: Set<string>;
  selectedIcao: string | null;
  trail: [number, number][];
  airportLabels: MajorAirport[];
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

export default function LeafletRadarMap({
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
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const acLayerRef = useRef<L.LayerGroup | null>(null);
  const apLayerRef = useRef<L.LayerGroup | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [zoomTick, setZoomTick] = useState(0);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let cancelled = false;
    let raf = 0;
    let map: L.Map | null = null;
    const invTimers: number[] = [];

    const MIN_PX = 64;

    const reportView = () => {
      if (!map) return;
      const c = map.getCenter();
      const z = map.getZoom();
      onViewChange(c.lat, c.lng, leafletZoomToGlobeCameraAltitude(z));
    };
    const bumpZoom = () => setZoomTick((n) => n + 1);
    const onZoomEnd = () => {
      bumpZoom();
      reportView();
    };
    const onMapClick = () => onSelect(null);
    const onResize = () => {
      map?.invalidateSize({ animate: false });
    };

    const mount = () => {
      if (cancelled || map) return;
      const box = el.getBoundingClientRect();
      if (box.width < MIN_PX || box.height < MIN_PX) {
        raf = requestAnimationFrame(mount);
        return;
      }

      const home = getDefaultHomePov();
      const z0 = globeAltitudeToLeafletZoom(home.altitude);
      map = L.map(el, {
        center: [home.lat, home.lng],
        zoom: z0,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
        worldCopyJump: true,
        minZoom: 2,
        maxZoom: 20,
        zoomSnap: 1,
        zoomAnimation: false,
        fadeAnimation: false,
        preferCanvas: true,
      });
      const tile = getLeafletTileLayerConfig();
      const tileOpts: L.TileLayerOptions = {
        attribution: tile.tileLayerOptions.attribution,
        maxZoom: tile.tileLayerOptions.maxZoom,
      };
      if (tile.tileLayerOptions.subdomains != null) {
        tileOpts.subdomains = tile.tileLayerOptions.subdomains;
      }
      if (tile.tileLayerOptions.tileSize != null) {
        tileOpts.tileSize = tile.tileLayerOptions.tileSize;
      }
      if (tile.tileLayerOptions.zoomOffset != null) {
        tileOpts.zoomOffset = tile.tileLayerOptions.zoomOffset;
      }
      L.tileLayer(tile.url, tileOpts).addTo(map);

      const acLayer = L.layerGroup().addTo(map);
      const apLayer = L.layerGroup().addTo(map);
      mapRef.current = map;
      acLayerRef.current = acLayer;
      apLayerRef.current = apLayer;

      map.on("moveend", reportView);
      map.on("zoomend", onZoomEnd);
      reportView();
      map.on("click", onMapClick);

      window.addEventListener("resize", onResize);
      const inv = () => {
        if (!cancelled && map) map.invalidateSize({ animate: false, pan: false });
      };
      requestAnimationFrame(inv);
      invTimers.push(
        ...[0, 48, 120, 320, 720].map((ms) =>
          window.setTimeout(inv, ms),
        ),
      );

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setMapReady(true);
        });
      });
    };

    const ro = new ResizeObserver(() => {
      if (cancelled) return;
      if (map) map.invalidateSize({ animate: false });
      else mount();
    });
    ro.observe(el);
    mount();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      invTimers.forEach((id) => window.clearTimeout(id));
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      if (map) {
        map.off("click", onMapClick);
        map.off("moveend", reportView);
        map.off("zoomend", onZoomEnd);
        map.remove();
      }
      mapRef.current = null;
      acLayerRef.current = null;
      apLayerRef.current = null;
      trailRef.current = null;
      setMapReady(false);
    };
  }, [onSelect, onViewChange]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const acLayer = acLayerRef.current;
    if (!map || !acLayer) return;

    acLayer.clearLayers();
    const z = map.getZoom();
    for (const a of aircraft) {
      if (a.lat == null || a.lng == null) continue;
      const sel = a.icao24 === selectedIcao;
      const watch = watchIcao.has(a.icao24);
      let fill = acMarkerColor(a);
      if (sel) fill = "#fbbf24";
      else if (watch) fill = "#c084fc";
      const stroke = sel ? "#fff7ed" : "rgba(15,23,42,0.92)";

      const m = L.marker([a.lat, a.lng], {
        icon: aircraftPlaneDivIcon(a.heading, fill, stroke, sel, z),
      });
      const label = `${(a.callsign?.trim() || a.icao24).slice(0, 12)}${watch ? " · ★" : ""}`;
      m.bindTooltip(label, { direction: "top", opacity: 0.95, className: "radar-leaflet-tip" });
      m.on("click", (ev) => {
        L.DomEvent.stopPropagation(ev);
        onSelect(a);
      });
      m.addTo(acLayer);
    }
  }, [mapReady, aircraft, selectedIcao, watchIcao, onSelect, zoomTick]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const apLayer = apLayerRef.current;
    if (!map || !apLayer) return;
    apLayer.clearLayers();
    if (suppressHubLabels || !onAirportLabelClick) return;
    for (const ap of airportLabels) {
      const c = L.circleMarker([ap.lat, ap.lng], {
        radius: 5,
        stroke: true,
        color: "rgba(226,232,240,0.55)",
        weight: 1,
        fillColor: "rgba(34,211,238,0.35)",
        fillOpacity: 0.75,
      });
      c.bindTooltip(`${ap.icao} · ${ap.name}`, { direction: "top" });
      c.on("click", (ev) => {
        L.DomEvent.stopPropagation(ev);
        onAirportLabelClick(ap.icao);
      });
      c.addTo(apLayer);
    }
  }, [mapReady, airportLabels, suppressHubLabels, onAirportLabelClick]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    if (trailRef.current) {
      map.removeLayer(trailRef.current);
      trailRef.current = null;
    }
    if (trail.length >= 2) {
      trailRef.current = L.polyline(trail as L.LatLngExpression[], {
        color: "rgba(253,224,138,0.88)",
        weight: 3,
        opacity: 0.9,
      }).addTo(map);
    }
  }, [mapReady, trail]);

  useEffect(() => {
    if (!mapReady) return;
    if (!follow || followLat == null || followLng == null) return;
    const map = mapRef.current;
    if (!map) return;
    const z = Math.max(map.getZoom(), 12);
    map.flyTo([followLat, followLng], z, { duration: 0.55, easeLinearity: 0.22 });
  }, [mapReady, follow, followLat, followLng]);

  useEffect(() => {
    if (!mapReady || !cameraToken) return;
    const map = mapRef.current;
    if (!map) return;
    const z = globeAltitudeToLeafletZoom(cameraPovAlt);
    const dur = Math.min((cameraTransitionMs ?? 1600) / 1000, 2.8);
    map.flyTo([cameraLat, cameraLng], z, { duration: dur, easeLinearity: 0.2 });
  }, [mapReady, cameraToken, cameraLat, cameraLng, cameraPovAlt, cameraTransitionMs]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const inv = () => map.invalidateSize({ animate: false, pan: false });
    const ids = [0, 60, 200, 500].map((ms) => window.setTimeout(inv, ms));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [mapReady]);

  return (
    <div
      ref={rootRef}
      className="radar-leaflet-host absolute inset-0 z-0 h-full w-full"
      style={{ minHeight: "100%", minWidth: "100%" }}
    />
  );
}
