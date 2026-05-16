/**
 * Basemap for react-globe.gl tile engine (slippy XYZ).
 * Default: Carto Voyager with OSM labels (streets / places when zoomed in), like typical flight UIs.
 * Set NEXT_PUBLIC_GLOBE_TILES=esri for satellite, or add Mapbox token for Mapbox satellite.
 */

export type GlobeBasemap =
  | "esri_satellite"
  | "mapbox_satellite"
  | "carto_voyager"
  | "carto_positron";

function envTrim(key: string): string | undefined {
  return process.env[key]?.trim();
}

function cartoHost(x: number, y: number, level: number): string {
  const hosts = ["a", "b", "c", "d"] as const;
  return hosts[(x + y + level) % 4]!;
}

export function getGlobeBasemap(): GlobeBasemap {
  const token = envTrim("NEXT_PUBLIC_MAPBOX_TOKEN");
  if (token) return "mapbox_satellite";
  const mode = envTrim("NEXT_PUBLIC_GLOBE_TILES")?.toLowerCase();
  if (mode === "esri" || mode === "satellite" || mode === "imagery") return "esri_satellite";
  if (mode === "positron" || mode === "light") return "carto_positron";
  if (mode === "carto" || mode === "streets" || mode === "voyager") return "carto_voyager";
  return "carto_voyager";
}

export function globeBasemapIsSatellite(): boolean {
  const b = getGlobeBasemap();
  return b === "esri_satellite" || b === "mapbox_satellite";
}

/** Esri World Imagery — XYZ /{z}/{y}/{x}. */
export function esriWorldImageryTileUrl(x: number, y: number, level: number): string {
  return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${level}/${y}/${x}`;
}

function mapboxSatelliteTileUrl(x: number, y: number, level: number): string {
  const token = envTrim("NEXT_PUBLIC_MAPBOX_TOKEN") ?? "";
  return `https://api.mapbox.com/v4/mapbox.satellite/${level}/${x}/${y}@2x.jpg?access_token=${encodeURIComponent(token)}`;
}

/** Carto Voyager — OSM-derived streets, neighborhoods, water (labels on). @2x for retina. */
export function cartoVoyagerTileUrl(x: number, y: number, level: number): string {
  const h = cartoHost(x, y, level);
  return `https://${h}.basemaps.cartocdn.com/rastertiles/voyager/${level}/${x}/${y}@2x.png`;
}

/** Carto Positron — light basemap, full OSM labeling. */
export function cartoPositronTileUrl(x: number, y: number, level: number): string {
  const h = cartoHost(x, y, level);
  return `https://${h}.basemaps.cartocdn.com/light_all/${level}/${x}/${y}@2x.png`;
}

export function resolveGlobeTileUrl(x: number, y: number, level: number): string {
  switch (getGlobeBasemap()) {
    case "mapbox_satellite":
      return mapboxSatelliteTileUrl(x, y, level);
    case "carto_positron":
      return cartoPositronTileUrl(x, y, level);
    case "carto_voyager":
      return cartoVoyagerTileUrl(x, y, level);
    default:
      return esriWorldImageryTileUrl(x, y, level);
  }
}

export function getGlobeMapAttribution(): string {
  switch (getGlobeBasemap()) {
    case "mapbox_satellite":
      return "Imagery © Mapbox © OpenStreetMap · OpenSky state vectors";
    case "carto_voyager":
    case "carto_positron":
      return "Map tiles © CARTO · Data © OpenStreetMap contributors · ADSB.lol";
    default:
      return "Imagery © Esri, Maxar, Earthstar Geographics & GIS community · OpenSky state vectors";
  }
}

export type LeafletTileLayerOptions = {
  attribution: string;
  maxZoom: number;
  subdomains?: string;
  tileSize?: number;
  zoomOffset?: number;
};

/** Leaflet L.tileLayer options aligned with {@link getGlobeBasemap}. */
export function getLeafletTileLayerConfig(): {
  url: string;
  tileLayerOptions: LeafletTileLayerOptions;
} {
  const b = getGlobeBasemap();
  const token = envTrim("NEXT_PUBLIC_MAPBOX_TOKEN") ?? "";

  if (b === "mapbox_satellite" && token) {
    return {
      url: `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg?access_token=${encodeURIComponent(token)}`,
      tileLayerOptions: {
        attribution: "© Mapbox © OpenStreetMap",
        maxZoom: 20,
      },
    };
  }
  if (b === "carto_positron") {
    return {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
      tileLayerOptions: {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> © CARTO',
        maxZoom: 20,
        subdomains: "abcd",
      },
    };
  }
  if (b === "carto_voyager") {
    return {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      tileLayerOptions: {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> © CARTO',
        maxZoom: 20,
        subdomains: "abcd",
      },
    };
  }
  return {
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    tileLayerOptions: {
      attribution: "Tiles © Esri",
      maxZoom: 19,
    },
  };
}
