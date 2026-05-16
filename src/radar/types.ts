export type ToastHue = "rose" | "amber" | "cyan" | "violet";

export type ToastItem = {
  id: number;
  tag: string;
  line: string;
  hue: ToastHue;
  side: "left" | "right";
};

export type CameraNudge = {
  token: number;
  lat: number;
  lng: number;
  alt: number;
  /** ms passed to globe `pointOfView` animation; 0 = snap (live geo). */
  transitionMs?: number;
};

export type GlobePov = { lat: number; lng: number; altitude: number };
