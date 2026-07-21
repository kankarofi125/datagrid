# DataGrid

Nigerian airtime, data & bills VTU platform + reseller engine.  
**Infrastructure Modernism** — control-room UI, phone-first, PWA-ready.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Prisma + **local SQLite** (`prisma/dev.db`)
- Phone OTP (simulated in dev), Paystack / Monnify simulators
- VTU provider adapter with **Simulator** failover

## Quick start

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo credentials

| Role  | Phone        | OTP  | PIN  |
|-------|--------------|------|------|
| User  | 08030000000  | 1234 | 1234 |
| Admin | 08000000001  | 1234 | 1234 |

OTP is always logged to the server console in `OTP_MODE=simulate`.

## Marketing scroll video

The landing page includes a **scroll-scrubbed phone story**:

- Keyframes + MP4/WebM: `public/media/scroll/`
- Component: `src/components/landing/ScrollPhoneStory.tsx`
- Scroll progress seeks `hero-phone.mp4` / crossfades stills
- Respects `prefers-reduced-motion` (stills only)

Story arc: number detect → pick plan → PIN → processing → delivered → faster connection.

## Payments (dev)

`PAYMENT_MODE=simulate` (default):

- **Paystack** — funds wallet immediately on “Pay with Paystack (sim)”
- **Monnify** — issues reserved VA; “Simulate bank transfer” credits wallet

## Scripts

| Command        | Purpose              |
|----------------|----------------------|
| `pnpm dev`     | Dev server           |
| `pnpm build`   | Production build     |
| `pnpm db:push` | Sync Prisma schema   |
| `pnpm db:seed` | Seed networks/plans  |
| `pnpm db:reset`| Wipe + reseed        |

## Money path (M2)

1. Log in → **Wallet** → Fund (Paystack sim instant, or Monnify VA + “Simulate bank transfer”)
2. **Data** / **Airtime** → number auto-detects network → plan → PIN pad → wallet debit → VTU sim → receipt
3. Failed VTU auto-refunds wallet. Ledger on wallet page. Idempotent buy keys.

```bash
# Authenticated buy (after login cookie)
POST /api/vtu/data   { phone, planId, pin }
POST /api/vtu/airtime { phone, amount, pin }
GET  /api/wallet
POST /api/wallet/fund { amount, method: "paystack"|"monnify" }
POST /api/webhooks/paystack
POST /api/webhooks/monnify
```

## Milestones

- **M1** ✅ Design system, landing + scroll video, guest widget, auth OTP, dashboard shell
- **M2** ✅ Wallet ledger debit/credit, Paystack/Monnify sim + webhooks, authenticated data/airtime + PIN, beneficiaries, receipts trail
- **M3** ✅ Electricity (token), cable (IUC), betting (18+), exam pins, notifications bell, dual mobile/desktop
- **M4** ✅ Referrals + commissions, agent tier, reseller API keys, scheduled top-ups + runner
- **M5** ✅ Admin panel, dual-approval credits, audit, PWA install, security headers

### M5 admin

| Path | Purpose |
|------|---------|
| `/admin` | GMV, revenue, success rate, recent orders |
| `/admin/rates` | Plan retail/reseller editor |
| `/admin/providers` | Primary/fallback, health, failure sim |
| `/admin/users` | Role, suspend, KYC |
| `/admin/wallets` | Manual credit dual-approval |
| `/admin/disputes` | Open/resolve + refund |
| `/admin/settings` | Referral/agent thresholds |
| `/admin/audit` | Full audit trail |

Admin login: **08000000001** · OTP **1234**  
Security: CSP, X-Frame-Options, nosniff. PWA install prompt after 2nd visit.

### Post-M5 polish

| Feature | Where |
|---------|--------|
| Print / PDF + TXT receipts | `/api/receipts/[orderRef]?format=html\|txt` |
| Wallet → wallet transfer | Wallet → Send money |
| Commission → main payout | Wallet → Payout commission |
| Flutterwave fund (sim/real) | Wallet fund tab FLW |
| VTpass + ClubKonnect adapters | Failover chain + provider logs |
| Low-data mode | Settings → Data saver |

```bash
# Receipt PDF via browser print dialog
open "http://localhost:3000/api/receipts/DG-…?format=html"
```

### M4 growth & automation

| Feature | Path / API |
|---------|------------|
| Referrals desk | `/referrals` · `GET /api/referrals` |
| Agent + API keys | `/agent` · `GET/POST/DELETE /api/agent/keys` |
| Schedules | `/schedules` · `CRUD /api/schedules` · `POST /api/schedules/run` |
| Public reseller API | `POST /api/public/v1/data` · `/airtime` · `GET /status` |

```bash
# Reseller buy (Bearer dg_live_…)
curl -X POST localhost:3000/api/public/v1/data \
  -H "Authorization: Bearer dg_live_…" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0803…","planId":"…","pin":"1234"}'

# Cron (dev open; prod needs CRON_SECRET)
curl -X POST localhost:3000/api/schedules/run -H "x-cron-secret: $CRON_SECRET"
```

Commissions: signup bonus on first fund; purchase % for 12 months → commission wallet.  
Agent unlock: lifetime volume ≥ setting `agent.volume_threshold_ngn` (default ₦500k).

### M3 services

| Service | Path | Flow |
|---------|------|------|
| Electricity | `/buy/electricity` | DisCo → 11-digit meter validate → PIN → huge mono token |
| Cable | `/buy/cable` | Biller → IUC name trust moment → package → PIN |
| Betting | `/buy/betting` | 18+ gate → platform → ID → fund |
| Exam pins | `/buy/pins` | WAEC/NECO/NABTEB → pin delivery + copy |

```bash
POST /api/vtu/electricity | cable | betting | pins
POST /api/vtu/validate   { type: METER|IUC|BETTING }
GET  /api/catalog/billers?category=ELECTRICITY|CABLE|BETTING|EXAM
GET  /api/notifications
```

## Env

Copy `.env.example` → `.env`. Never commit secrets.
