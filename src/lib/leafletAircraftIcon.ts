import L from "leaflet";

function headingDeg(heading: number | null | undefined): number {
  const h = heading;
  if (h == null || !Number.isFinite(h)) return 0;
  return ((h % 360) + 360) % 360;
}

function planePx(zoom: number, selected: boolean): number {
  const z = Math.max(2, Math.min(18, zoom));
  const base = 20 + z * 1.35;
  return Math.round(selected ? base + 10 : base);
}

/**
 * Top-down aircraft silhouette for Leaflet (nose toward −Y, rotated by true heading °).
 * Styling aligns with GlobeCanvas marker colors (fill from caller).
 */
export function aircraftPlaneDivIcon(
  heading: number | null | undefined,
  fill: string,
  stroke: string,
  selected: boolean,
  zoom: number,
): L.DivIcon {
  const px = planePx(zoom, selected);
  const deg = headingDeg(heading);
  const sw = selected ? 2.1 : 1.05;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-18 -18 36 36" width="${px}" height="${px}" style="display:block" aria-hidden="true">
  <g transform="rotate(${deg})">
    <path
      d="M0,-15.5 L4.8,-4.8 L15.5,-1.2 L15.5,4.2 L5.2,2.8 L3.2,14.2 L-3.2,14.2 L-5.2,2.8 L-15.5,4.2 L-15.5,-1.2 L-4.8,-4.8 Z"
      fill="${fill}"
      stroke="${stroke}"
      stroke-width="${sw}"
      stroke-linejoin="round"
    />
  </g>
</svg>`;

  return L.divIcon({
    className: "radar-ac-plane-marker",
    html: `<div class="radar-ac-plane-wrap">${svg}</div>`,
    iconSize: [px, px],
    iconAnchor: [px / 2, px / 2],
  });
}
