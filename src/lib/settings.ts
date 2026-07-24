import { prisma } from "@/lib/db";
import { cached, CacheKeys, CacheTags, CacheTTL } from "@/lib/cache";

const defaults = {
  "referral.signup_bonus_ngn": 100,
  "referral.purchase_pct_bps": 50, // 0.5%
  "referral.window_months": 12,
  "agent.volume_threshold_ngn": 500_000,
};

export async function getSettingNumber(key: keyof typeof defaults): Promise<number> {
  return cached(
    CacheKeys.settingNumber(key),
    async () => {
      const row = await prisma.setting.findUnique({ where: { key } });
      if (!row) return defaults[key];
      try {
        const value = JSON.parse(row.value);
        return typeof value === "number" ? value : Number(value) || defaults[key];
      } catch {
        return Number(row.value) || defaults[key];
      }
    },
    { ttl: CacheTTL.settings, tags: [CacheTags.settings] }
  );
}

export async function getSettingJson<T>(key: string, fallback: T): Promise<T> {
  return cached(
    CacheKeys.settingJson(key),
    async () => {
      const row = await prisma.setting.findUnique({ where: { key } });
      if (!row) return fallback;
      try {
        return JSON.parse(row.value) as T;
      } catch {
        return fallback;
      }
    },
    { ttl: CacheTTL.settings, tags: [CacheTags.settings] }
  );
}
