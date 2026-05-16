import {
  buildAdsbQueriesForBBox,
  mergeAircraftByIcao,
  parseAdsbV2Response,
  type AdsbV2Response,
} from "@/lib/adsbLol";
import type { Aircraft, BBox } from "@/lib/opensky";

async function fetchAdsbLolCell(lat: number, lon: number, dist: number): Promise<Aircraft[]> {
  const q = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    dist: String(dist),
  });
  const res = await fetch(`/api/adsb/v2/latlon?${q.toString()}`, { cache: "no-store" });
  const json = (await res.json()) as AdsbV2Response & { ok?: boolean; error?: string };
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || res.statusText || "ADSB.lol error");
  }
  if (json && typeof json === "object" && "ok" in json && json.ok === false) {
    throw new Error((json as { error?: string }).error || "ADSB.lol error");
  }
  return parseAdsbV2Response(json);
}

/** Live traffic via ADSB.lol — multi-cell when zoomed out (API max 250 nm / call). */
export async function fetchAdsbLolStates(bbox: BBox): Promise<Aircraft[]> {
  const queries = buildAdsbQueriesForBBox(bbox);
  const batchSize = 3;
  const merged: Aircraft[] = [];
  for (let i = 0; i < queries.length; i += batchSize) {
    const chunk = queries.slice(i, i + batchSize);
    const part = await Promise.all(chunk.map((c) => fetchAdsbLolCell(c.lat, c.lon, c.dist)));
    merged.push(...part.flat());
  }
  return mergeAircraftByIcao(merged);
}
