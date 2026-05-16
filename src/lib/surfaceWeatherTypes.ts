export type SurfaceWeatherHourly = { time: string; tempC: number };

export type SurfaceWeatherPayload = {
  ok: true;
  lat: number;
  lng: number;
  timezone: string | null;
  current: {
    time: string;
    tempC: number | null;
    apparentC: number | null;
    rhPct: number | null;
    precipMm: number | null;
    code: number | null;
    condition: string | null;
    windKt: number | null;
    windDeg: number | null;
    cloudPct: number | null;
    isDay: boolean;
    pressureMslHpa: number | null;
  };
  hourly: SurfaceWeatherHourly[];
};
