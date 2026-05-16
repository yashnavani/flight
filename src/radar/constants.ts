import type { GlobePov } from "@/radar/types";

/** Short name in header / UI. */
export const HER = process.env.NEXT_PUBLIC_HER_NAME?.trim() || "Prisha";

/** Full name on welcome screen. */
export const HER_FULL_NAME =
  process.env.NEXT_PUBLIC_HER_FULL_NAME?.trim() || "Prisha Wadhwa";

export const BIRTHDAY_ISO = process.env.NEXT_PUBLIC_BIRTHDAY_ISO?.trim() ?? "";

/** Mumbai Intl — METAR default when env empty (her area: Santa Cruz / BOM). */
export const HOME_ICAO = (() => {
  const t = process.env.NEXT_PUBLIC_HOME_AIRPORT_ICAO?.trim();
  if (!t) return "VABB";
  return t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "VABB";
})();

/** Mumbai (VABB) region when NEXT_PUBLIC_HOME_LAT/LNG unset — matches HOME_ICAO / METAR default. */
const DEFAULT_HOME: GlobePov = {
  lat: 19.081,
  lng: 72.851,
  altitude: 0.38,
};

export function getDefaultHomePov(): GlobePov {
  const lat = Number(process.env.NEXT_PUBLIC_HOME_LAT);
  const lng = Number(process.env.NEXT_PUBLIC_HOME_LNG);
  const alt = Number(process.env.NEXT_PUBLIC_HOME_GLOBE_ALT);
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    const altitude =
      Number.isFinite(alt) && alt >= 0.12 && alt <= 5 ? alt : DEFAULT_HOME.altitude;
    return { lat, lng, altitude };
  }
  return { ...DEFAULT_HOME };
}

export const WATCH_STORAGE_KEY = "her-flight-radar-watchlist";
