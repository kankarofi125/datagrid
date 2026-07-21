import { prisma } from "@/lib/db";

const defaults = {
  "referral.signup_bonus_ngn": 100,
  "referral.purchase_pct_bps": 50, // 0.5%
  "referral.window_months": 12,
  "agent.volume_threshold_ngn": 500_000,
};

export async function getSettingNumber(key: keyof typeof defaults): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return defaults[key];
  try {
    const v = JSON.parse(row.value);
    return typeof v === "number" ? v : Number(v) || defaults[key];
  } catch {
    return Number(row.value) || defaults[key];
  }
}

export async function getSettingJson<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}
