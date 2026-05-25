import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import { loadConfig } from "./lib/env.mjs";
import { createPkcePair, createStateToken } from "./lib/pkce.mjs";
import {
  appendSyncLog,
  appendWebhookEvent,
  clearGarminConnection,
  getGarminConnection,
  putOAuthState,
  takeOAuthState,
  upsertGarminConnection,
} from "./lib/store.mjs";
import { exchangeCodeForToken, withBearer } from "./lib/garmin.mjs";

const config = loadConfig();
const staticRoot = path.resolve(process.cwd(), "..");

const staticTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function corsHeaders(origin = "") {
  const allowed = config.allowedOrigins.includes(origin) ? origin : config.allowedOrigins[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Webhook-Token",
    Vary: "Origin",
  };
}

function sendJson(res, status, data, origin = "") {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...corsHeaders(origin),
  });
  res.end(body);
}

function sendHtml(res, status, html, origin = "") {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    ...corsHeaders(origin),
  });
  res.end(html);
}

function sendNoContent(res, origin = "") {
  res.writeHead(204, corsHeaders(origin));
  res.end();
}

async function readJsonBody(req, limitBytes = 1_000_000) {
  let size = 0;
  let data = "";
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw new Error("Body too large");
    data += chunk;
  }
  if (!data) return {};
  return JSON.parse(data);
}

function requireGarminOAuthConfig() {
  const missing = [];
  if (!config.garminClientId) missing.push("GARMIN_CLIENT_ID");
  if (!config.garminAuthorizeUrl) missing.push("GARMIN_OAUTH_AUTHORIZE_URL");
  if (!config.garminTokenUrl) missing.push("GARMIN_OAUTH_TOKEN_URL");
  return missing;
}

function garminAuthorizeUrl({ state, challenge }) {
  const url = new URL(config.garminAuthorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.garminClientId);
  url.searchParams.set("redirect_uri", config.garminRedirectUri);
  url.searchParams.set("scope", config.garminScope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

async function tryServeStatic(req, res, pathname, origin) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  if (requested.startsWith("/api/")) return false;
  if (requested === "/health") return false;
  if (requested.includes("..")) return false;

  const filePath = path.resolve(staticRoot, `.${requested}`);
  if (!filePath.startsWith(staticRoot)) return false;
  try {
    const bytes = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": staticTypes[ext] || "application/octet-stream",
      "Content-Length": bytes.length,
      ...corsHeaders(origin),
    });
    res.end(bytes);
    return true;
  } catch {
    if (path.extname(requested)) return false;
    const indexPath = path.resolve(staticRoot, "index.html");
    const html = await fs.readFile(indexPath);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": html.length,
      ...corsHeaders(origin),
    });
    res.end(html);
    return true;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const reqOrigin = req.headers.origin || "";
    if (!req.url) return sendJson(res, 400, { error: "Missing URL" }, reqOrigin);
    const origin = `http://${req.headers.host || "localhost"}`;
    const url = new URL(req.url, origin);
    const path = url.pathname;
    const method = req.method || "GET";

    if (method === "OPTIONS") return sendNoContent(res, reqOrigin);
    if (method === "GET" && (await tryServeStatic(req, res, path, reqOrigin))) return;

    if (method === "GET" && path === "/health") {
      return sendJson(
        res,
        200,
        {
        ok: true,
        service: "runpro-garmin-backend",
        now: new Date().toISOString(),
      },
        reqOrigin,
      );
    }

    if (method === "GET" && path === "/api/garmin/connect/start") {
      const missing = requireGarminOAuthConfig();
      if (missing.length) {
        return sendJson(
          res,
          500,
          {
          error: "Missing Garmin OAuth config",
          missing,
        },
          reqOrigin,
        );
      }

      const userId = url.searchParams.get("user_id") || "local-athlete";
      const redirectAfter = url.searchParams.get("after") || `${config.frontendOrigin}/`;
      const { verifier, challenge } = createPkcePair();
      const state = createStateToken();

      await putOAuthState(state, {
        userId,
        verifier,
        redirectAfter,
        createdAt: new Date().toISOString(),
      });

      const authorizeUrl = garminAuthorizeUrl({ state, challenge });
      if (url.searchParams.get("redirect") === "1") {
        res.writeHead(302, { Location: authorizeUrl, ...corsHeaders() });
        return res.end();
      }
      return sendJson(
        res,
        200,
        {
        user_id: userId,
        state,
        authorize_url: authorizeUrl,
      },
        reqOrigin,
      );
    }

    if (method === "GET" && path === "/api/garmin/connect/availability") {
      const missing = requireGarminOAuthConfig();
      return sendJson(
        res,
        200,
        {
        ready: missing.length === 0,
        missing,
      },
        reqOrigin,
      );
    }

    if (method === "GET" && path === "/api/garmin/connect/callback") {
      const state = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      if (error) {
        return sendHtml(
          res,
          400,
          `<h2>Garmin authorization declined</h2><p>${error}</p><p>You can close this tab.</p>`,
          reqOrigin,
        );
      }
      if (!state || !code) {
        return sendHtml(
          res,
          400,
          "<h2>Invalid callback</h2><p>Missing <code>state</code> or <code>code</code>.</p>",
          reqOrigin,
        );
      }

      const pending = await takeOAuthState(state);
      if (!pending) {
        return sendHtml(res, 400, "<h2>Invalid state</h2><p>This OAuth session is expired.</p>", reqOrigin);
      }

      try {
        const token = await exchangeCodeForToken(config, {
          code,
          codeVerifier: pending.verifier,
        });
        await upsertGarminConnection(pending.userId, {
          ...token,
          connectedAt: new Date().toISOString(),
          status: "connected",
        });
        await appendSyncLog({
          type: "oauth.connected",
          userId: pending.userId,
          at: new Date().toISOString(),
        });
      } catch (oauthError) {
        return sendHtml(
          res,
          500,
          `<h2>Token exchange failed</h2><pre>${String(oauthError.message || oauthError)}</pre>`,
          reqOrigin,
        );
      }

      const next = pending.redirectAfter || `${config.frontendOrigin}/`;
      return sendHtml(
        res,
        200,
        `<h2>Garmin connected</h2><p>You can close this tab now.</p><script>setTimeout(()=>location.href=${JSON.stringify(next)},1200)</script>`,
        reqOrigin,
      );
    }

    if (method === "GET" && path.startsWith("/api/users/") && path.endsWith("/garmin")) {
      const userId = path.split("/")[3];
      const conn = await getGarminConnection(userId);
      return sendJson(
        res,
        200,
        {
        user_id: userId,
        connected: Boolean(conn?.accessToken),
        garmin: conn
          ? {
              status: conn.status || "connected",
              scope: conn.scope || "",
              connectedAt: conn.connectedAt || null,
              updatedAt: conn.updatedAt || null,
              expiresAt: conn.expiresAt || null,
            }
          : null,
      },
        reqOrigin,
      );
    }

    if (method === "DELETE" && path.startsWith("/api/users/") && path.endsWith("/garmin")) {
      const userId = path.split("/")[3];
      await clearGarminConnection(userId);
      await appendSyncLog({
        type: "oauth.disconnected",
        userId,
        at: new Date().toISOString(),
      });
      return sendJson(res, 200, { ok: true, user_id: userId }, reqOrigin);
    }

    if (method === "POST" && path === "/api/garmin/webhooks/activity") {
      if (config.webhookToken) {
        const token = req.headers["x-webhook-token"];
        if (token !== config.webhookToken) {
          return sendJson(res, 401, { error: "Invalid webhook token" }, reqOrigin);
        }
      }

      const payload = await readJsonBody(req);
      await appendWebhookEvent({
        at: new Date().toISOString(),
        payload,
      });
      await appendSyncLog({
        type: "webhook.activity.received",
        at: new Date().toISOString(),
      });
      return sendJson(res, 200, { ok: true }, reqOrigin);
    }

    if (method === "GET" && path === "/api/sync/activities/pull") {
      const userId = url.searchParams.get("user_id") || "local-athlete";
      const conn = await getGarminConnection(userId);
      if (!conn?.accessToken) {
        return sendJson(res, 400, { error: "User is not connected to Garmin." }, reqOrigin);
      }
      if (!config.garminActivityPullUrl) {
        return sendJson(res, 400, { error: "GARMIN_ACTIVITY_PULL_URL is not configured." }, reqOrigin);
      }

      const result = await withBearer(config, conn, userId, async (authorization) => {
        const response = await fetch(config.garminActivityPullUrl, {
          headers: { Authorization: authorization },
        });
        const text = await response.text();
        let body;
        try {
          body = JSON.parse(text);
        } catch {
          body = { raw: text };
        }
        return { status: response.status, body };
      });

      await appendSyncLog({
        type: "sync.activities.pull",
        userId,
        at: new Date().toISOString(),
        status: result.status,
      });
      return sendJson(res, 200, result, reqOrigin);
    }

    if (method === "POST" && path === "/api/sync/workouts/push") {
      const body = await readJsonBody(req);
      const userId = body.user_id || "local-athlete";
      const workout = body.workout || null;
      if (!workout) return sendJson(res, 400, { error: "Missing `workout` in body." }, reqOrigin);

      const conn = await getGarminConnection(userId);
      if (!conn?.accessToken) return sendJson(res, 400, { error: "User is not connected to Garmin." }, reqOrigin);
      if (!config.garminTrainingPushUrl) {
        return sendJson(res, 400, { error: "GARMIN_TRAINING_PUSH_URL is not configured." }, reqOrigin);
      }

      const result = await withBearer(config, conn, userId, async (authorization) => {
        const response = await fetch(config.garminTrainingPushUrl, {
          method: "POST",
          headers: {
            Authorization: authorization,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(workout),
        });
        const text = await response.text();
        let payload;
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { raw: text };
        }
        return { status: response.status, payload };
      });

      await appendSyncLog({
        type: "sync.workout.push",
        userId,
        at: new Date().toISOString(),
        status: result.status,
      });
      return sendJson(res, 200, result, reqOrigin);
    }

    return sendJson(res, 404, { error: "Not found" }, reqOrigin);
  } catch (error) {
    const reqOrigin = req.headers.origin || "";
    return sendJson(res, 500, { error: String(error.message || error) }, reqOrigin);
  }
});

server.listen(config.port, () => {
  console.log(`RunPro Garmin backend listening on http://localhost:${config.port}`);
});
