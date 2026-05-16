/** ICAO 3-letter airline designator → display name (subset; extend as needed). */
const AIRLINE: Record<string, string> = {
  AIC: "Air India",
  IGO: "IndiGo",
  SEJ: "SpiceJet",
  AXB: "Air India Express",
  GOW: "Go First",
  VTI: "Vistara",
  AIX: "Air India Express",
  UAL: "United Airlines",
  DAL: "Delta Air Lines",
  AAL: "American Airlines",
  SWA: "Southwest Airlines",
  JBU: "JetBlue",
  ASA: "Alaska Airlines",
  HAL: "Hawaiian Airlines",
  FDX: "FedEx Express",
  UPS: "UPS Airlines",
  BAW: "British Airways",
  VIR: "Virgin Atlantic",
  EZY: "easyJet",
  RYR: "Ryanair",
  DLH: "Lufthansa",
  CFG: "Condor",
  SWR: "Swiss",
  AUA: "Austrian",
  KLM: "KLM",
  AFL: "Aeroflot",
  UAE: "Emirates",
  ETH: "Ethiopian Airlines",
  QTR: "Qatar Airways",
  THY: "Turkish Airlines",
  SIA: "Singapore Airlines",
  MAS: "Malaysia Airlines",
  JST: "Jetstar",
  VOZ: "Virgin Australia",
  ANZ: "Air New Zealand",
  CES: "China Eastern",
  CSN: "China Southern",
  CCA: "Air China",
  JAL: "Japan Airlines",
  ANA: "All Nippon Airways",
  KAL: "Korean Air",
  AFR: "Air France",
  ELY: "El Al",
  ETD: "Etihad Airways",
  OMA: "Oman Air",
  SVA: "Saudia",
  FAD: "flydubai",
  WZZ: "Wizz Air",
  TAP: "TAP Air Portugal",
  IBE: "Iberia",
  ITY: "ITA Airways",
  AZA: "ITA Airways",
  EWG: "Eurowings",
  NAX: "Norwegian",
  SAS: "Scandinavian Airlines",
  FIN: "Finnair",
  ICE: "Icelandair",
  ACA: "Air Canada",
  WJA: "WestJet",
  LAN: "LATAM Airlines",
  TAM: "LATAM Brasil",
  ARG: "Aerolíneas Argentinas",
};

export function icaoAirlineDesignator(callsign: string | null | undefined): string | null {
  const raw = callsign?.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw || raw.length < 3) return null;
  const pre = raw.slice(0, 3);
  return /^[A-Z]{3}/.test(pre) ? pre : null;
}

export function airlineNameFromCallsign(callsign: string | null | undefined): string | null {
  const d = icaoAirlineDesignator(callsign);
  if (!d) return null;
  return AIRLINE[d] ?? null;
}
