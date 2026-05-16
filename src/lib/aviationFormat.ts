const MS_TO_KT = 1.94384;
const M_TO_FT = 3.28084;

export function metersPerSecToKnots(ms: number | null): number | null {
  if (ms === null || Number.isNaN(ms)) return null;
  return ms * MS_TO_KT;
}

export function metersToFeet(m: number | null): number | null {
  if (m === null || Number.isNaN(m)) return null;
  return m * M_TO_FT;
}

/** Vertical rate in ft/min (positive climb). */
export function metersPerSecToFpm(ms: number | null): number | null {
  if (ms === null || Number.isNaN(ms)) return null;
  return ms * M_TO_FT * 60;
}

export function fmtInt(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function fmtFixed(n: number | null, digits: number): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function fmtUtcTime(unixSec: number | null): string {
  if (unixSec === null || !Number.isFinite(unixSec)) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    hour12: false,
  }).format(new Date(unixSec * 1000));
}

export function fmtClockAge(unixSec: number | null, nowSec: number): string {
  if (unixSec === null || !Number.isFinite(unixSec)) return "—";
  const d = Math.max(0, nowSec - unixSec);
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  return `${Math.floor(d / 3600)}h ${Math.floor((d % 3600) / 60)}m`;
}
