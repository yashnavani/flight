/** OpenSky / ADS-B emitter category (0–20). */
export function describeAdsbCategory(cat: number | null): string | null {
  if (cat === null || Number.isNaN(cat)) return null;
  const labels: Record<number, string> = {
    0: "No category info",
    1: "No emitter category",
    2: "Light",
    3: "Small",
    4: "Large",
    5: "High vortex large",
    6: "Heavy",
    7: "High performance",
    8: "Rotorcraft",
    9: "Glider",
    10: "Lighter-than-air",
    11: "Parachute / skydiver",
    12: "Ultralight",
    14: "UAV",
    15: "Space / trans-atmospheric",
    16: "Surface vehicle (emergency)",
    17: "Surface vehicle (service)",
    18: "Point obstacle",
    19: "Cluster obstacle",
    20: "Line obstacle",
  };
  return labels[cat] ?? `Category ${cat}`;
}

export function describePositionSource(src: number | null): string | null {
  if (src === null || Number.isNaN(src)) return null;
  if (src === 0) return "ADS-B";
  if (src === 1) return "ASTERIX";
  if (src === 2) return "MLAT";
  if (src === 3) return "FLARM";
  return `Source ${src}`;
}
