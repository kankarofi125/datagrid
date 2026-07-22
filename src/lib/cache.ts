import { getRedis } from "@/lib/redis";

export type CacheOpts = {
  /** TTL seconds */
  ttl?: number;
  tags?: string[];
};

const DEFAULT_TTL = 60;

/**
 * Cache-aside helper. If Redis is down/missing, runs loader directly.
 */
export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  opts: CacheOpts = {}
): Promise<T> {
  const redis = getRedis();
  const ttl = opts.ttl ?? DEFAULT_TTL;

  if (redis) {
    try {
      const hit = await redis.get<T>(key);
      if (hit !== null && hit !== undefined) {
        return hit as T;
      }
    } catch (e) {
      console.warn("[cache] get failed", key, e);
    }
  }

  const value = await loader();

  if (redis) {
    try {
      await redis.set(key, value, { ex: ttl });
      if (opts.tags?.length) {
        for (const tag of opts.tags) {
          await redis.sadd(`tag:${tag}`, key);
          await redis.expire(`tag:${tag}`, Math.max(ttl * 4, 300));
        }
      }
    } catch (e) {
      console.warn("[cache] set failed", key, e);
    }
  }

  return value;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return (await redis.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttl = DEFAULT_TTL) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttl });
  } catch (e) {
    console.warn("[cache] set failed", key, e);
  }
}

/** Delete one key or every key under a tag */
export async function invalidate(keysOrTag: string | string[], asTag = false) {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (asTag) {
      const tags = Array.isArray(keysOrTag) ? keysOrTag : [keysOrTag];
      for (const tag of tags) {
        const members = await redis.smembers(`tag:${tag}`);
        if (members?.length) {
          await redis.del(...members, `tag:${tag}`);
        } else {
          await redis.del(`tag:${tag}`);
        }
      }
      return;
    }
    const keys = Array.isArray(keysOrTag) ? keysOrTag : [keysOrTag];
    if (keys.length) await redis.del(...keys);
  } catch (e) {
    console.warn("[cache] invalidate failed", keysOrTag, e);
  }
}

export const CacheKeys = {
  analytics: (days: number) => `analytics:v1:${days}`,
  catalogPlans: (network?: string | null) =>
    `catalog:plans:v1:${network || "all"}`,
  catalogNetworks: () => "catalog:networks:v1",
  catalogBillers: () => "catalog:billers:v1",
  adminServices: () => "admin:services:v1",
  adminGateways: () => "admin:gateways:v1",
  adminIntegrations: () => "admin:integrations:v1",
  adminUsers: () => "admin:users:v1",
  wallet: (userId: string) => `wallet:v1:${userId}`,
  notifications: (userId: string) => `notif:v1:${userId}`,
  health: () => "health:v1",
};

export const CacheTags = {
  analytics: "analytics",
  catalog: "catalog",
  admin: "admin",
  wallet: (userId: string) => `wallet:${userId}`,
  notifications: (userId: string) => `notif:${userId}`,
};
