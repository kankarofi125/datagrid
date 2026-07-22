import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { cached, CacheKeys, CacheTags, invalidate } from "@/lib/cache";

const GATEWAY_KEYS = [
  "gateway.paystack",
  "gateway.flutterwave",
  "gateway.monnify",
] as const;

const DEFAULTS: Record<string, object> = {
  "gateway.paystack": {
    name: "Paystack",
    enabled: false,
    mode: "simulate",
    publicKeySet: false,
    secretKeySet: false,
  },
  "gateway.flutterwave": {
    name: "Flutterwave",
    enabled: false,
    mode: "simulate",
    secretKeySet: false,
  },
  "gateway.monnify": {
    name: "Monnify",
    enabled: false,
    mode: "simulate",
    apiKeySet: false,
    contractSet: false,
  },
};

export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const data = await cached(
    CacheKeys.adminGateways(),
    async () => {
      const rows = await prisma.setting.findMany({
        where: { key: { in: [...GATEWAY_KEYS] } },
      });
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

      const envHints = {
        paystack: Boolean(process.env.PAYSTACK_SECRET_KEY),
        flutterwave: Boolean(process.env.FLUTTERWAVE_SECRET_KEY),
        monnify: Boolean(process.env.MONNIFY_API_KEY),
      };

      const gateways = GATEWAY_KEYS.map((key) => {
        let cfg = { ...DEFAULTS[key] } as Record<string, unknown>;
        try {
          if (map[key]) cfg = { ...cfg, ...JSON.parse(map[key]) };
        } catch {
          /* keep default */
        }
        const code = key.split(".")[1];
        return {
          key,
          code,
          ...cfg,
          envConfigured: envHints[code as keyof typeof envHints] || false,
          paymentMode: process.env.PAYMENT_MODE || "simulate",
        };
      });

      return {
        gateways,
        paymentMode: process.env.PAYMENT_MODE || "simulate",
        cachedAt: new Date().toISOString(),
      };
    },
    { ttl: 60, tags: [CacheTags.admin] }
  );

  return NextResponse.json(data, {
    headers: { "X-Cache-Layer": "upstash" },
  });
}

export async function PATCH(req: Request) {
  const { session, error } = await adminGate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const key = String(body.key || "");
  if (!GATEWAY_KEYS.includes(key as (typeof GATEWAY_KEYS)[number])) {
    return NextResponse.json({ error: "Unknown gateway" }, { status: 400 });
  }

  const existing = await prisma.setting.findUnique({ where: { key } });
  let prev: Record<string, unknown> = { ...DEFAULTS[key] };
  try {
    if (existing) prev = { ...prev, ...JSON.parse(existing.value) };
  } catch {
    /* */
  }

  const next = {
    ...prev,
    enabled: body.enabled != null ? Boolean(body.enabled) : prev.enabled,
    mode: body.mode || prev.mode,
  };

  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(next) },
    create: { key, value: JSON.stringify(next) },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session!.userId,
      action: "GATEWAY_UPDATE",
      entityType: "Setting",
      entityId: key,
      before: JSON.stringify(prev),
      after: JSON.stringify(next),
    },
  });

  await invalidate(CacheKeys.adminGateways());
  await invalidate([CacheTags.admin], true);

  return NextResponse.json({ ok: true, gateway: { key, ...next } });
}
