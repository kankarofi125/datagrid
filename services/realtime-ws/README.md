# DataGrid Realtime WebSocket Gateway

Long-lived WebSocket service for live events (tx delivered, cron, notifications).  
Deploy on **Fly.io** or **Railway** — not on Vercel serverless.

## Local

```bash
cd services/realtime-ws
npm install
export UPSTASH_REDIS_REST_URL=...
export UPSTASH_REDIS_REST_TOKEN=...
export REALTIME_WS_SECRET=dev-secret
npm run dev
```

Connect:

```js
const ws = new WebSocket("ws://localhost:8080/?channel=public:grid");
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

## Fly.io

```bash
cd services/realtime-ws
fly launch --no-deploy   # or use existing fly.toml
fly secrets set \
  UPSTASH_REDIS_REST_URL="..." \
  UPSTASH_REDIS_REST_TOKEN="..." \
  REALTIME_WS_SECRET="long-random-secret"
fly deploy
```

Public URL example: `wss://datagrid-realtime-ws.fly.dev`

## Railway

1. New project → deploy from repo subdirectory `services/realtime-ws`
2. Set the same env vars
3. Generate public domain → `wss://your-app.up.railway.app`

## Wire to Next.js (Vercel)

In Vercel project env:

```
NEXT_PUBLIC_REALTIME_WS_URL=wss://datagrid-realtime-ws.fly.dev
REALTIME_WS_INTERNAL_URL=https://datagrid-realtime-ws.fly.dev
REALTIME_WS_SECRET=same-as-ws-service
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

- Browser uses **WebSocket** when `NEXT_PUBLIC_REALTIME_WS_URL` is set  
- Falls back to **SSE** `/api/realtime/stream` otherwise  
- Next.js `publishRealtime()` POSTs to `/publish` on the WS service for instant fan-out  

## Auth note

Channel is chosen by query string (`?channel=admin:ops`). For production, put the WS service behind your domain and optionally validate a short-lived token (future enhancement).
