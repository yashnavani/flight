const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

const REFRESH_MARGIN_MS = 45_000;

type Creds = { clientId: string; clientSecret: string };

let tokenCache: { accessToken: string; expiresAtMs: number } | null = null;
let inflight: Promise<string> | null = null;
let fileCredsCache: Creds | null | undefined;

export function invalidateOpenSkyTokenCache(): void {
  tokenCache = null;
}

async function loadCredentialsFromFile(): Promise<Creds | null> {
  const [{ existsSync, readFileSync }, pathMod] = await Promise.all([
    import("node:fs"),
    import("node:path"),
  ]);
  const filePath =
    process.env.OPENSKY_CREDENTIALS_PATH?.trim() ||
    pathMod.join(process.cwd(), "credentials.json");
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf8");
    const j = JSON.parse(raw) as Record<string, unknown>;
    const clientId =
      (typeof j.clientId === "string" && j.clientId) ||
      (typeof j.client_id === "string" && j.client_id) ||
      null;
    const clientSecret =
      (typeof j.clientSecret === "string" && j.clientSecret) ||
      (typeof j.client_secret === "string" && j.client_secret) ||
      null;
    if (clientId && clientSecret) return { clientId, clientSecret };
  } catch {
    /* ignore */
  }
  return null;
}

/** Env first, then optional credentials.json (gitignored). */
export async function resolveOpenSkyClientCredentials(): Promise<Creds | null> {
  const id = process.env.OPENSKY_CLIENT_ID?.trim();
  const secret = process.env.OPENSKY_CLIENT_SECRET?.trim();
  if (id && secret) return { clientId: id, clientSecret: secret };
  if (fileCredsCache !== undefined) return fileCredsCache;
  fileCredsCache = await loadCredentialsFromFile();
  return fileCredsCache;
}

async function fetchAccessToken(creds: Creds): Promise<{ access_token: string; expires_in?: number }> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenSky OAuth ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("OpenSky OAuth: missing access_token");
  return { access_token: json.access_token, expires_in: json.expires_in };
}

/** Bearer for /api/states — cached; refresh before expiry (OpenSky REST auth). */
export async function getOpenSkyBearerToken(): Promise<string | null> {
  const creds = await resolveOpenSkyClientCredentials();
  if (!creds) return null;

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs - REFRESH_MARGIN_MS > now) {
    return tokenCache.accessToken;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    const data = await fetchAccessToken(creds);
    const ttlSec = typeof data.expires_in === "number" ? data.expires_in : 1800;
    tokenCache = {
      accessToken: data.access_token,
      expiresAtMs: Date.now() + ttlSec * 1000,
    };
    return data.access_token;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export async function buildOpenSkyStatesHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { Accept: "application/json" };
  try {
    const token = await getOpenSkyBearerToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* anonymous fallback */
  }
  return headers;
}
