import type { MajorAirport } from "@/data/majorAirports";
import type { Aircraft } from "@/lib/opensky";

/** Phrase anchor — “Pear Island” label sits east so it doesn’t cover the letters. */
export const PEAR_ISLAND_CENTER = { lat: -7.9, lng: 66.35 } as const;

const PEAR_LABEL_LNG_OFFSET = 0.22;

/** Hub-style label (map pin east of the “i love you” formation). */
export const PEAR_ISLAND_LABEL: MajorAirport = {
  icao: "PEAR",
  name: "Pear Island — zoom in for ✈ message",
  lat: PEAR_ISLAND_CENTER.lat,
  lng: PEAR_ISLAND_CENTER.lng + PEAR_LABEL_LNG_OFFSET,
};

/** Leaflet: render like basemap city pins (Malé-style), not only tooltip. */
export const PEAR_ISLAND_ICAO = "PEAR" as const;

/** Mock plane ICAO block 0xdead00+ (never selectable). Tight letter footprint when zoomed in. */
const DY = 0.00245;
const DX_BASE = 0.0026;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function isPearIslandMockIcao(icao24: string): boolean {
  if (icao24.length !== 6) return false;
  const n = parseInt(icao24, 16);
  return Number.isFinite(n) && n >= 0xdead00 && n < 0xdeb000;
}

/** Distance from camera to Pear Island anchor (km). */
export function distanceToPearIslandKm(lat: number, lng: number): number {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Infinity;
  return haversineKm(lat, lng, PEAR_ISLAND_CENTER.lat, PEAR_ISLAND_CENTER.lng);
}

/**
 * Show “Pear Island” hub label whenever you’re in the Indian Ocean region (findable).
 */
export function shouldShowPearIslandGuidanceLabel(pov: {
  lat: number;
  lng: number;
  altitude: number;
}): boolean {
  if (!Number.isFinite(pov.lat) || !Number.isFinite(pov.lng)) return false;
  /** Wide so India / Lanka / Maldives / W. Indonesia always get the pin. */
  return distanceToPearIslandKm(pov.lat, pov.lng) < 6500;
}

/**
 * Mock “i love you” dots: globe-style low altitude OR tight map view (Leaflet maps alt high).
 */
export function shouldShowPearIslandLoveMessage(pov: {
  lat: number;
  lng: number;
  altitude: number;
}): boolean {
  if (!Number.isFinite(pov.lat) || !Number.isFinite(pov.lng) || !Number.isFinite(pov.altitude)) {
    return false;
  }
  const d = distanceToPearIslandKm(pov.lat, pov.lng);
  if (d > 520) return false;
  if (pov.altitude <= 0.4) return true;
  /* 2D: zoomed regional view still uses high “altitude”; allow when over the text. */
  if (d < 110 && pov.altitude <= 1.75) return true;
  return false;
}

/** 5×5 rows, '#' = mock plane cell, '.' empty (fixed width per char). */
const FONT: Record<string, string[]> = {
  i: ["..#..", "..#..", "..#..", "..#..", ".###."],
  l: [".#...", ".#...", ".#...", ".#...", ".####"],
  o: [".###.", ".#.#.", ".#.#.", ".#.#.", ".###."],
  v: ["#...#", "#...#", ".#.#.", "..#..", "..#.."],
  e: [".####", ".#...", ".###.", ".#...", ".####"],
  y: ["#...#", ".#.#.", "..#..", "...#.", "###.."],
  u: ["#...#", "#...#", "#...#", "#...#", ".###."],
  " ": [".....", ".....", ".....", ".....", "....."],
};

function charGrid(ch: string): string[] {
  const key = ch.toLowerCase();
  return FONT[key] ?? FONT[" "]!;
}

function mockHex(idx: number): string {
  return (0xdead00 + idx).toString(16).padStart(6, "0").slice(-6);
}

function mockAc(idx: number, lat: number, lng: number, heading: number): Aircraft {
  const hex = mockHex(idx);
  const now = Math.floor(Date.now() / 1000);
  return {
    icao24: hex,
    callsign: null,
    originCountry: "",
    lat,
    lng,
    baroAltitude: 10_500,
    geoAltitude: 10_600,
    onGround: false,
    velocity: 120,
    heading,
    verticalRate: 0,
    squawk: null,
    category: null,
    positionSource: 0,
    spi: false,
    lastContact: now,
    timePosition: now,
    emitterCategoryStr: "A3",
  };
}

function buildPhraseLayouts(): { lat: number; lng: number; heading: number }[] {
  const phrase = "i love you";
  const midLat = PEAR_ISLAND_CENTER.lat;
  const dx = DX_BASE / Math.cos((midLat * Math.PI) / 180);

  const rows: string[][] = [];
  const maxRows = 5;
  for (let r = 0; r < maxRows; r++) {
    let line = "";
    for (let i = 0; i < phrase.length; i++) {
      const g = charGrid(phrase[i]!);
      line += g[r] ?? ".....";
    }
    rows.push(line.split(""));
  }

  const width = rows[0]?.length ?? 0;
  const height = rows.length;
  const anchorLng = PEAR_ISLAND_CENTER.lng - ((width - 1) * dx) / 2;
  const anchorLat = PEAR_ISLAND_CENTER.lat + ((height - 1) * DY) / 2;

  const pts: { lat: number; lng: number; heading: number }[] = [];
  let idx = 0;
  for (let r = 0; r < height; r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== "#") continue;
      const lat = anchorLat - r * DY;
      const lng = anchorLng + c * dx;
      const heading = 0;
      pts.push({ lat, lng, heading });
      idx += 1;
    }
  }
  return pts;
}

let cached: Aircraft[] | null = null;

/** Static mock fleet spelling “i love you” (Pear Island). */
export function getPearIslandMockFleet(): Aircraft[] {
  if (cached) return cached;
  const layouts = buildPhraseLayouts();
  cached = layouts.map((p, i) => mockAc(i, p.lat, p.lng, p.heading));
  return cached;
}
