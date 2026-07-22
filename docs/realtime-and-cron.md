# Realtime WebSocket + Vercel Cron

## Cron (Vercel)

Configured in `vercel.json`:

| Path | Schedule | Job |
|------|----------|-----|
| `/api/cron/schedules` | every 5 min | Run due scheduled top-ups |
| `/api/cron/provider-health` | every 10 min | Probe VTU providers |

### Setup

1. Vercel → Project → Settings → Environment Variables  
2. Set `CRON_SECRET` to a long random string  
3. Deploy (crons run on Production)  
4. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically

### Manual test

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  https://YOUR_APP.vercel.app/api/cron/schedules

curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  https://YOUR_APP.vercel.app/api/cron/provider-health
```

## WebSocket service (Fly / Railway)

Location: `services/realtime-ws/`

### Why

Vercel serverless cannot hold long-lived WebSocket connections. This tiny Node service does.

### Deploy Fly

```bash
cd services/realtime-ws
npm install
fly launch --no-deploy
fly secrets set \
  UPSTASH_REDIS_REST_URL="..." \
  UPSTASH_REDIS_REST_TOKEN="..." \
  REALTIME_WS_SECRET="same-as-vercel"
fly deploy
```

### Deploy Railway

- New service from subdirectory `services/realtime-ws`
- Same env secrets
- Public HTTPS domain → use as `wss://...`

### Wire Vercel app

```
NEXT_PUBLIC_REALTIME_WS_URL=wss://datagrid-realtime-ws.fly.dev
REALTIME_WS_INTERNAL_URL=https://datagrid-realtime-ws.fly.dev
REALTIME_WS_SECRET=<shared secret>
```

Client auto-uses WebSocket when public URL is set; otherwise SSE.
