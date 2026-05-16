import type { ToastHue } from "@/radar/types";

export type LoveQuipKind =
  | "plane_lock"
  | "sky_clear"
  | "airport"
  | "refresh"
  | "palette_open"
  | "watch_spotted"
  | "watch_on"
  | "watch_off"
  | "follow_on"
  | "follow_off"
  | "close_sheet"
  | "gift_open"
  | "metar_click"
  | "locate_me_on"
  | "locate_me_off"
  | "locate_me_fail";

export type LoveToastPayload = { tag: string; line: string; hue: ToastHue };

const POOLS: Record<LoveQuipKind, { tag: string; line: string; hue: ToastHue }[]> = {
  plane_lock: [
    { tag: "LOCK ON", line: "Vectors to my heart — cleared direct YOU.", hue: "rose" },
    { tag: "TCAS RA", line: "Climb, descend, whatever — I always choose you.", hue: "rose" },
    { tag: "ADS-B", line: "Out of the noise floor, you’re the only squawk I track.", hue: "cyan" },
    { tag: "RNAV", line: "LNAV/VNAV engaged… romance path is active to you.", hue: "violet" },
    { tag: "FD", line: "Flight director says: bank toward forever.", hue: "cyan" },
    { tag: "MCP", line: "Altitude select: cloud nine. Speed: butterflies.", hue: "amber" },
    { tag: "AP", line: "Autopilot off — I want to hand-fly this love.", hue: "rose" },
    { tag: "DME", line: "Slant range shrinking. Emotional range: zero.", hue: "violet" },
    { tag: "GPS RAIM", line: "Integrity OK. Heart RAIM: also OK.", hue: "cyan" },
    { tag: "WX RADAR", line: "Cell ahead? I’ll deviate around anything but you.", hue: "amber" },
    { tag: "TAWS", line: "Terrain! …is how flat I feel when you’re away.", hue: "rose" },
    { tag: "EGPWS", line: "Glideslope of love — slightly above, never short.", hue: "violet" },
    { tag: "CDI", line: "Needle centered when you’re on frequency.", hue: "cyan" },
    { tag: "LOC", line: "Captured localizer: you.", hue: "rose" },
    { tag: "GS", line: "Glideslope alive — soft landing on your smile.", hue: "amber" },
    { tag: "AFCS", line: "Coupled approach to forever. Minimums: your laugh.", hue: "violet" },
  ],
  sky_clear: [
    { tag: "CLR DSP", line: "Display clear — but you’re still on my radar.", hue: "cyan" },
    { tag: "STBY", line: "Selection cancelled. Love frequency stays guarded.", hue: "amber" },
    { tag: "MAP", line: "Blue sky mode: still vectoring thoughts to you.", hue: "violet" },
    { tag: "RADAR", line: "No paint? No problem. You’re always in memory.", hue: "rose" },
    { tag: "VIS", line: "CAVOK where it matters — between us.", hue: "cyan" },
  ],
  airport: [
    { tag: "METAR REQ", line: "New ATIS: I love you, information ROMEO.", hue: "cyan" },
    { tag: "TAF", line: "Forecast: prolonged periods of heart with gusts of kiss.", hue: "violet" },
    { tag: "AWOS", line: "Automated, except my feelings — those are manual.", hue: "amber" },
    { tag: "ATC", line: "Cleared to the apron of my affections.", hue: "rose" },
    { tag: "NOTAM", line: "FOD on runway: none. FOD in heart: you.", hue: "cyan" },
    { tag: "SID", line: "Departure procedure: climb on love, maintain smile.", hue: "violet" },
    { tag: "STAR", line: "Arrival route ends at hug gate.", hue: "rose" },
    { tag: "PAPI", line: "Four whites = too high… on love. I’ll flare anyway.", hue: "amber" },
  ],
  refresh: [
    { tag: "RE-SYNC", line: "Reloading pixels and devotion — same checksum.", hue: "cyan" },
    { tag: "DATAFRAME", line: "Fresh ADS-B frames, stale crush on you: impossible.", hue: "violet" },
    { tag: "PING", line: "SSR interrogation: reply with a smile?", hue: "amber" },
    { tag: "UDP", line: "Packet loss zero between us.", hue: "cyan" },
    { tag: "CACHE", line: "Invalidated turbulence; cached sunshine for you.", hue: "rose" },
  ],
  palette_open: [
    { tag: "⌘K", line: "Command palette: search targets… default YOU.", hue: "violet" },
    { tag: "FMS", line: "Scratchpad ready — type love, EXEC.", hue: "cyan" },
    { tag: "ACARS", line: "Free text to my favorite flight deck soul.", hue: "amber" },
    { tag: "CPDLC", line: "Expect vectors romance — compliance: wilco.", hue: "rose" },
  ],
  watch_spotted: [
    { tag: "TRAFFIC", line: "Watched target in sight — {d} on my heart scope.", hue: "amber" },
    { tag: "ASDE-X", line: "Surface movement: {d} just taxied into my feels.", hue: "cyan" },
    { tag: "SMR", line: "Primary paint on {d}. Secondary: butterflies.", hue: "rose" },
    { tag: "MULTI", line: "Correlated track {d} — fused with affection.", hue: "violet" },
  ],
  watch_on: [
    { tag: "STBY", line: "Starred like a chart favorite — never folding that plate.", hue: "amber" },
    { tag: "MEM", line: "Wrote your hex into watch memory — non-volatile love.", hue: "rose" },
    { tag: "CHK", line: "Checklist item: adore. Status: complete.", hue: "cyan" },
  ],
  watch_off: [
    { tag: "RMV", line: "Off the watchlist, never off the frequency.", hue: "violet" },
    { tag: "CLR", line: "Cleared watch — still cleared to hug later.", hue: "amber" },
  ],
  follow_on: [
    { tag: "CHASE", line: "Camera coupled — I’m your wingman in software.", hue: "cyan" },
    { tag: "TCAS", line: "Resolution advisory: maintain closeness.", hue: "rose" },
    { tag: "MAP", line: "Track-up, you-up. World rotates; crush doesn’t.", hue: "violet" },
  ],
  follow_off: [
    { tag: "SUSP", line: "Follow suspended — freedom’s yours, heart isn’t.", hue: "amber" },
    { tag: "HDG", line: "Manual heading — I’ll catch your next orbit.", hue: "cyan" },
  ],
  close_sheet: [
    { tag: "DSMIS", line: "Panel stowed. Love NOTAM still active.", hue: "violet" },
    { tag: "END", line: "Closing briefing — romance remains cruise.", hue: "rose" },
    { tag: "CHK", line: "Flows complete. You still have my clearance.", hue: "cyan" },
  ],
  gift_open: [
    { tag: "VIP", line: "Secret passenger brief: you upgrade everything.", hue: "rose" },
    { tag: "VIP", line: "Easter egg found — like finding VOR in IMC.", hue: "amber" },
    { tag: "1L", line: "First class only: reserved seat in my head forever.", hue: "violet" },
  ],
  metar_click: [
    { tag: "WX", line: "Raw METAR tap — decoded subtext: I adore you.", hue: "cyan" },
    { tag: "TAF", line: "You read weather like poetry. I read you like home.", hue: "rose" },
    { tag: "CAT", line: "Flight category of us: mostly VFR with MVFR cuddles.", hue: "amber" },
  ],
  locate_me_on: [
    { tag: "GPS", line: "Own-ship position — camera coupled to your coordinates.", hue: "cyan" },
    { tag: "GNSS", line: "Live fix streaming — map centered on you, not the ether.", hue: "violet" },
  ],
  locate_me_off: [
    { tag: "GPS", line: "Own-ship track ended — camera free again.", hue: "amber" },
    { tag: "CLR", line: "Geolocation watch cleared. Privacy: respected.", hue: "cyan" },
  ],
  locate_me_fail: [
    { tag: "GPS", line: "Could not read your position — check browser permission / HTTPS.", hue: "rose" },
    { tag: "NAV", line: "Position unavailable — sky still loves you, the fix didn’t.", hue: "amber" },
  ],
};

const decks = new Map<LoveQuipKind, LoveToastPayload[]>();

function refill(kind: LoveQuipKind) {
  const src = POOLS[kind];
  const copy = src.map((x) => ({ ...x }));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  decks.set(kind, copy);
}

function draw(kind: LoveQuipKind): LoveToastPayload {
  let d = decks.get(kind);
  if (!d || d.length === 0) refill(kind);
  d = decks.get(kind)!;
  return d.pop()!;
}

function fillDetail(line: string, detail?: string): string {
  if (!detail) return line.replace(/\{d\}/g, "that track");
  return line.replace(/\{d\}/g, detail);
}

export function pickLoveQuip(kind: LoveQuipKind, detail?: string): LoveToastPayload {
  const q = draw(kind);
  return {
    tag: q.tag,
    line: fillDetail(q.line, detail),
    hue: q.hue,
  };
}

const SHEET_FLAIR = [
  "Baro-aided crush · QNH you.",
  "Stable approach: heart on glideslope.",
  "No TCAS threat — you’re still my priority traffic.",
  "Crosswind correction applied to hug vector.",
  "MCP: engaged. Heart: always manual.",
  "♥ Cleared IMC → VMC the moment you text. ♥ ♥",
  "Fuel jettison: anxiety. Remaining: love.",
  "Hold short of nothing with you.",
];

export function pickSheetFlair(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return SHEET_FLAIR[h % SHEET_FLAIR.length]!;
}
