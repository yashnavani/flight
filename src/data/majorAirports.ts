/** Major hubs for globe labels when zoomed in (not full nav database). */
export type MajorAirport = {
  icao: string;
  name: string;
  lat: number;
  lng: number;
};

export const MAJOR_AIRPORTS: MajorAirport[] = [
  { icao: "KJFK", name: "New York JFK", lat: 40.6413, lng: -73.7781 },
  { icao: "KLAX", name: "Los Angeles", lat: 33.9416, lng: -118.4085 },
  { icao: "KORD", name: "Chicago O'Hare", lat: 41.9742, lng: -87.9073 },
  { icao: "KATL", name: "Atlanta", lat: 33.6407, lng: -84.4277 },
  { icao: "KDEN", name: "Denver", lat: 39.8561, lng: -104.6737 },
  { icao: "KDFW", name: "Dallas/Fort Worth", lat: 32.8998, lng: -97.0403 },
  { icao: "KSFO", name: "San Francisco", lat: 37.6213, lng: -122.379 },
  { icao: "KSEA", name: "Seattle-Tacoma", lat: 47.4502, lng: -122.3088 },
  { icao: "KMIA", name: "Miami", lat: 25.7959, lng: -80.287 },
  { icao: "KBOS", name: "Boston Logan", lat: 42.3656, lng: -71.0096 },
  { icao: "KIAD", name: "Washington Dulles", lat: 38.9531, lng: -77.4565 },
  { icao: "CYYZ", name: "Toronto Pearson", lat: 43.6777, lng: -79.6248 },
  { icao: "EGLL", name: "London Heathrow", lat: 51.47, lng: -0.4543 },
  { icao: "LFPG", name: "Paris CDG", lat: 49.0097, lng: 2.5479 },
  { icao: "EDDF", name: "Frankfurt", lat: 50.0379, lng: 8.5622 },
  { icao: "EHAM", name: "Amsterdam", lat: 52.3105, lng: 4.7683 },
  { icao: "LEMD", name: "Madrid", lat: 40.4983, lng: -3.5676 },
  { icao: "LIRF", name: "Rome Fiumicino", lat: 41.8003, lng: 12.2389 },
  { icao: "LSZH", name: "Zurich", lat: 47.4647, lng: 8.5492 },
  { icao: "LOWW", name: "Vienna", lat: 48.1103, lng: 16.5697 },
  { icao: "LTFM", name: "Istanbul", lat: 41.2753, lng: 28.7519 },
  { icao: "OMDB", name: "Dubai", lat: 25.2532, lng: 55.3657 },
  { icao: "OERK", name: "Riyadh", lat: 24.9576, lng: 46.6988 },
  { icao: "OMAA", name: "Abu Dhabi", lat: 24.433, lng: 54.6511 },
  { icao: "OTHH", name: "Doha Hamad", lat: 25.2731, lng: 51.6081 },
  { icao: "VIDP", name: "Delhi", lat: 28.5562, lng: 77.1 },
  { icao: "VABB", name: "Mumbai", lat: 19.0896, lng: 72.8689 },
  { icao: "VOBL", name: "Bengaluru", lat: 13.1986, lng: 77.7066 },
  { icao: "VOMM", name: "Chennai", lat: 12.9941, lng: 80.1709 },
  { icao: "RJTT", name: "Tokyo Haneda", lat: 35.5494, lng: 139.7798 },
  { icao: "RJAA", name: "Tokyo Narita", lat: 35.7647, lng: 140.3864 },
  { icao: "RKSI", name: "Seoul Incheon", lat: 37.4602, lng: 126.4407 },
  { icao: "WSSS", name: "Singapore", lat: 1.3644, lng: 103.9915 },
  { icao: "WMKK", name: "Kuala Lumpur", lat: 2.7456, lng: 101.7099 },
  { icao: "WIII", name: "Jakarta", lat: -6.1256, lng: 106.6559 },
  { icao: "YSSY", name: "Sydney", lat: -33.9461, lng: 151.1772 },
  { icao: "YMML", name: "Melbourne", lat: -37.669, lng: 144.841 },
  { icao: "NZAA", name: "Auckland", lat: -37.0082, lng: 174.785 },
  { icao: "SBGR", name: "São Paulo GRU", lat: -23.4356, lng: -46.4731 },
  { icao: "SCEL", name: "Santiago", lat: -33.3928, lng: -70.7858 },
  { icao: "FACT", name: "Cape Town", lat: -33.9648, lng: 18.6017 },
  { icao: "FAOR", name: "Johannesburg", lat: -26.1392, lng: 28.246 },
  { icao: "HECA", name: "Cairo", lat: 30.1219, lng: 31.4056 },
  { icao: "ZBAA", name: "Beijing Capital", lat: 40.0801, lng: 116.584 },
  { icao: "ZSPD", name: "Shanghai Pudong", lat: 31.1434, lng: 121.805 },
  { icao: "VHHH", name: "Hong Kong", lat: 22.308, lng: 113.9185 },
];

const MAJOR_BY_ICAO = new Map(MAJOR_AIRPORTS.map((a) => [a.icao, a]));

export function majorAirportByIcao(icao: string | null | undefined) {
  if (!icao) return null;
  return MAJOR_BY_ICAO.get(icao.toUpperCase()) ?? null;
}

/** Great-circle distance in nautical miles (WGS84 sphere). */
export function greatCircleDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const φ1 = r(lat1);
  const φ2 = r(lat2);
  const Δφ = r(lat2 - lat1);
  const Δλ = r(lon2 - lon1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return 3440.065 * c;
}

/** Nearest hubs from a lat/lon (for “where is this fix” copy; not filed route). */
export function nearestMajorAirportsForPosition(
  lat: number,
  lng: number,
  limit = 3,
  maxNm = 480,
): { ap: MajorAirport; nm: number }[] {
  return MAJOR_AIRPORTS.map((ap) => ({ ap, nm: greatCircleDistanceNm(lat, lng, ap.lat, ap.lng) }))
    .filter((x) => Number.isFinite(x.nm) && x.nm <= maxNm)
    .sort((a, b) => a.nm - b.nm)
    .slice(0, limit);
}

export function airportsNearPov(
  pov: { lat: number; lng: number; altitude: number },
  max = 22,
): MajorAirport[] {
  if (!Number.isFinite(pov.altitude) || pov.altitude >= 1.22) return [];
  const span = Math.max(5, pov.altitude * 36);
  const scored = MAJOR_AIRPORTS.map((a) => {
    const d = Math.hypot(a.lat - pov.lat, (a.lng - pov.lng) * Math.cos((pov.lat * Math.PI) / 180));
    return { a, d };
  })
    .filter(({ d }) => d < span)
    .sort((x, y) => x.d - y.d)
    .slice(0, max)
    .map(({ a }) => a);
  return scored;
}
