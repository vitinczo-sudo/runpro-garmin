import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env");

if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function optional(name, fallback = "") {
  return process.env[name] || fallback;
}

export function loadConfig() {
  const renderExternalUrl = optional("RENDER_EXTERNAL_URL");
  const defaultPublicUrl = renderExternalUrl || optional("APP_BASE_URL", "http://localhost:8787");
  const config = {
    port: Number(optional("PORT", "8787")),
    frontendOrigin: optional("FRONTEND_ORIGIN", "http://localhost:4173"),
    frontendOrigins: optional("FRONTEND_ORIGINS", ""),
    appBaseUrl: optional("APP_BASE_URL", "http://localhost:8787"),
    appPublicUrl: optional("APP_PUBLIC_URL", defaultPublicUrl),
    garminClientId: optional("GARMIN_CLIENT_ID"),
    garminClientSecret: optional("GARMIN_CLIENT_SECRET"),
    garminAuthorizeUrl: optional("GARMIN_OAUTH_AUTHORIZE_URL"),
    garminTokenUrl: optional("GARMIN_OAUTH_TOKEN_URL"),
    garminScope: optional("GARMIN_OAUTH_SCOPE", "activity_export workout_import"),
    garminActivityPullUrl: optional("GARMIN_ACTIVITY_PULL_URL"),
    garminTrainingPushUrl: optional("GARMIN_TRAINING_PUSH_URL"),
    webhookToken: optional("GARMIN_WEBHOOK_TOKEN"),
  };

  config.garminRedirectUri = `${config.appPublicUrl}/api/garmin/connect/callback`;
  config.allowedOrigins = Array.from(
    new Set(
      [config.frontendOrigin, ...config.frontendOrigins.split(",")]
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  );
  return config;
}

export { required };
