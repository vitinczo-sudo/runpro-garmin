import fs from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "store.json");

const initialData = {
  users: {},
  oauthStates: {},
  webhooks: [],
  syncLogs: [],
};

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(initialData, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(storePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(initialData);
  }
}

async function writeStore(data) {
  await fs.writeFile(storePath, JSON.stringify(data, null, 2), "utf8");
}

export async function putOAuthState(state, payload) {
  const data = await readStore();
  data.oauthStates[state] = payload;
  await writeStore(data);
}

export async function takeOAuthState(state) {
  const data = await readStore();
  const value = data.oauthStates[state];
  delete data.oauthStates[state];
  await writeStore(data);
  return value || null;
}

export async function upsertGarminConnection(userId, connection) {
  const data = await readStore();
  const existing = data.users[userId] || {};
  data.users[userId] = {
    ...existing,
    garmin: {
      ...(existing.garmin || {}),
      ...connection,
      updatedAt: new Date().toISOString(),
    },
  };
  await writeStore(data);
  return data.users[userId].garmin;
}

export async function getGarminConnection(userId) {
  const data = await readStore();
  return data.users[userId]?.garmin || null;
}

export async function clearGarminConnection(userId) {
  const data = await readStore();
  if (data.users[userId]) delete data.users[userId].garmin;
  await writeStore(data);
}

export async function appendWebhookEvent(event) {
  const data = await readStore();
  data.webhooks.unshift(event);
  data.webhooks = data.webhooks.slice(0, 2000);
  await writeStore(data);
}

export async function appendSyncLog(log) {
  const data = await readStore();
  data.syncLogs.unshift(log);
  data.syncLogs = data.syncLogs.slice(0, 4000);
  await writeStore(data);
}
