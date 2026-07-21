import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

const KEYS = [
  "referral.signup_bonus_ngn",
  "referral.purchase_pct_bps",
  "referral.window_months",
  "agent.volume_threshold_ngn",
  "support.whatsapp",
  "brand.cac_rc",
] as const;

export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const rows = await prisma.setting.findMany({
    where: { key: { in: [...KEYS] } },
  });
  const map: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      map[r.key] = JSON.parse(r.value);
    } catch {
      map[r.key] = r.value;
    }
  }
  return NextResponse.json({ settings: map });
}

export async function PATCH(req: Request) {
  const { session, error } = await adminGate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const updates = body.settings as Record<string, unknown> | undefined;
  if (!updates) {
    return NextResponse.json({ error: "settings object required" }, { status: 400 });
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!KEYS.includes(key as (typeof KEYS)[number])) continue;
    await prisma.setting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });
  }

  await writeAudit({
    actorId: session!.userId,
    action: "SETTINGS_UPDATE",
    entityType: "Setting",
    after: updates,
  });

  return NextResponse.json({ ok: true });
}
