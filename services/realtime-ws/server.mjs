/**
 * DataGrid realtime WebSocket gateway
 * -----------------------------------
 * Deploy on Fly.io or Railway (long-lived process).
 *
 * Clients:  wss://host/?channel=user:ID|admin:ops|public:grid
 * Publish:  POST /publish  { channel, event }  header x-realtime-secret
 * Health:   GET /health
 *
 * Events also mirror into Upstash Redis so Vercel SSE can read them.
 */
import http from "node:http";
import { WebSocketServer } from "ws";
import { Redis } from "@upstash/redis";

const PORT = Number(process.env.PORT || 8080);
const SECRET =
  process.env.REALTIME_WS_SECRET || process.env.CRON_SECRET || "";
const POLL_MS = Number(process.env.REDIS_POLL_MS || 1500);

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const rooms = new Map();

function channelKey(channel) {
  return `rt:ch:${channel}`;
}

function join(channel, ws) {
  if (!rooms.has(channel)) rooms.set(channel, new Set());
  rooms.get(channel).add(ws);
  ws._channel = channel;
}

function leave(ws) {
  const ch = ws._channel;
  if (!ch) return;
  const set = rooms.get(ch);
  if (set) {
    set.delete(ws);
    if (set.size === 0) rooms.delete(ch);
  }
}

function broadcast(channel, event) {
  const set = rooms.get(channel);
  if (!set?.size) return 0;
  const payload = JSON.stringify({ type: "event", data: event });
  let n = 0;
  for (const client of set) {
    if (client.readyState === 1) {
      client.send(payload);
      n++;
    }
  }
  return n;
}

async function persistToRedis(channel, event) {
  if (!redis) return;
  try {
    const key = channelKey(channel);
    await redis.lpush(key, JSON.stringify(event));
    await redis.ltrim(key, 0, 99);
    await redis.expire(key, 3600);
    await redis.incr(`rt:seq:${channel}`);
  } catch (e) {
    console.warn("[redis] persist failed", e.message);
  }
}

async function pollRedis() {
  if (!redis) return;
  for (const channel of rooms.keys()) {
    try {
      const seq = Number((await redis.get(`rt:seq:${channel}`)) || 0);
      const last = rooms._seq?.get(channel) ?? -1;
      if (!rooms._seq) rooms._seq = new Map();
      if (seq === last) continue;
      rooms._seq.set(channel, seq);
      const raw = await redis.lrange(channelKey(channel), 0, 4);
      for (const item of (raw || []).reverse()) {
        const event =
          typeof item === "string" ? JSON.parse(item) : item;
        broadcast(channel, event);
      }
    } catch (e) {
      console.warn("[redis] poll", channel, e.message);
    }
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "datagrid-realtime-ws",
        rooms: rooms.size,
        clients: [...rooms.values()].reduce((n, s) => n + s.size, 0),
        redis: Boolean(redis),
        at: new Date().toISOString(),
      })
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/publish") {
    const hdr = req.headers["x-realtime-secret"] || "";
    if (SECRET && hdr !== SECRET) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    try {
      const body = await readBody(req);
      const channel = String(body.channel || "");
      const event = body.event || {
        type: body.type || "message",
        payload: body.payload,
        at: new Date().toISOString(),
      };
      if (!channel) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "channel required" }));
        return;
      }
      if (!event.at) event.at = new Date().toISOString();
      await persistToRedis(channel, event);
      const delivered = broadcast(channel, event);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, delivered }));
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message || "bad request" }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

const wss = new WebSocketServer({ server, path: "/" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const channel = url.searchParams.get("channel") || "public:grid";

  join(channel, ws);
  ws.send(
    JSON.stringify({
      type: "ready",
      data: {
        channel,
        transport: "websocket",
        redis: Boolean(redis),
        at: new Date().toISOString(),
      },
    })
  );

  ws.on("message", (buf) => {
    try {
      const msg = JSON.parse(String(buf));
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", data: { t: Date.now() } }));
      }
      if (msg.type === "subscribe" && msg.channel) {
        leave(ws);
        join(String(msg.channel), ws);
        ws.send(
          JSON.stringify({
            type: "ready",
            data: { channel: msg.channel, switched: true },
          })
        );
      }
    } catch {
      /* ignore */
    }
  });

  ws.on("close", () => leave(ws));
  ws.on("error", () => leave(ws));
});

setInterval(() => {
  for (const set of rooms.values()) {
    for (const ws of set) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "ping", data: { t: Date.now() } }));
      }
    }
  }
}, 25000);

if (redis) {
  setInterval(() => void pollRedis(), POLL_MS);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[datagrid-ws] listening on :${PORT} redis=${Boolean(redis)} rooms ready`
  );
});
