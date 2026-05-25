import { appendSyncLog, upsertGarminConnection } from "./store.mjs";

function form(data) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params;
}

function expiresAt(seconds) {
  if (!seconds) return null;
  return new Date(Date.now() + Number(seconds) * 1000).toISOString();
}

function authHeaders(config) {
  if (!config.garminClientSecret) return {};
  const basic = Buffer.from(`${config.garminClientId}:${config.garminClientSecret}`).toString("base64");
  return { Authorization: `Basic ${basic}` };
}

export async function exchangeCodeForToken(config, { code, codeVerifier }) {
  if (!config.garminTokenUrl) throw new Error("GARMIN_OAUTH_TOKEN_URL is not set.");
  const body = form({
    grant_type: "authorization_code",
    client_id: config.garminClientId,
    code,
    redirect_uri: config.garminRedirectUri,
    code_verifier: codeVerifier,
  });
  const response = await fetch(config.garminTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...authHeaders(config),
    },
    body,
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Token endpoint returned non-JSON: ${text.slice(0, 220)}`);
  }
  if (!response.ok) {
    throw new Error(`Token exchange failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type || "Bearer",
    scope: payload.scope || "",
    expiresAt: expiresAt(payload.expires_in),
    raw: payload,
  };
}

export async function refreshAccessToken(config, { userId, refreshToken }) {
  if (!config.garminTokenUrl) throw new Error("GARMIN_OAUTH_TOKEN_URL is not set.");
  const body = form({
    grant_type: "refresh_token",
    client_id: config.garminClientId,
    refresh_token: refreshToken,
  });
  const response = await fetch(config.garminTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...authHeaders(config),
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Token refresh failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  const updated = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || refreshToken,
    tokenType: payload.token_type || "Bearer",
    scope: payload.scope || "",
    expiresAt: expiresAt(payload.expires_in),
    raw: payload,
  };

  await upsertGarminConnection(userId, updated);
  await appendSyncLog({
    type: "token.refresh",
    userId,
    at: new Date().toISOString(),
  });
  return updated;
}

export async function withBearer(config, connection, userId, fn) {
  const now = Date.now();
  const exp = connection.expiresAt ? new Date(connection.expiresAt).getTime() : now + 3600_000;
  const nearExpiry = exp - now < 90_000;
  let active = connection;
  if (nearExpiry && connection.refreshToken) {
    active = await refreshAccessToken(config, { userId, refreshToken: connection.refreshToken });
  }
  return fn(`${active.tokenType || "Bearer"} ${active.accessToken}`);
}
