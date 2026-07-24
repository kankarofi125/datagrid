import { getRedis } from "@/lib/redis";

export type CacheOpts = {
  /** TTL seconds */
  ttl?: number;
  /** How long an expired value may be used if the loader is temporarily unavailable. */
  staleTtl?: number;
  tags?: string[];
};

const DEFAULT_TTL = 60;
const MAX_LOCAL_ENTRIES = 500;

type LocalEntry = {
  value: unknown;
  expiresAt: number;
  staleUntil: number;
  tags: string[];
};

const cacheScope = globalThis as typeof globalThis & {
  __datagridLocalCache?: Map<string, LocalEntry>;
  __datagridCacheLoads?: Map<string, Promise<unknown>>;
};
const localCache: Map<string, LocalEntry> =
  (cacheScope.__datagridLocalCache ??= new Map<string, LocalEntry>());
const activeLoads: Map<string, Promise<unknown>> =
  (cacheScope.__datagridCacheLoads ??= new Map<string, Promise<unknown>>());

function localSet<T>(
  key: string,
  value: T,
  ttl: number,
  staleTtl = Math.max(ttl * 5, 300),
  tags: string[] = []
) {
  const now = Date.now();
  localCache.delete(key);
  localCache.set(key, {
    value,
    expiresAt: now + ttl * 1000,
    staleUntil: now + (ttl + staleTtl) * 1000,
    tags,
  });

  while (localCache.size > MAX_LOCAL_ENTRIES) {
    const oldest = localCache.keys().next().value;
    if (!oldest) break;
    localCache.delete(oldest);
  }
}

function localFresh<T>(key: string): T | null {
  const entry = localCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.value as T;
}

/**
 * Two-level cache-aside helper with request coalescing and stale-if-error.
 * Redis remains the shared cache; the small process cache absorbs repeat reads
 * and can keep a page useful through a brief upstream interruption.
 */
export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  opts: CacheOpts = {}
): Promise<T> {
  const redis = getRedis();
  const ttl = opts.ttl ?? DEFAULT_TTL;
  const localHit = localFresh<T>(key);
  if (localHit !== null) return localHit;

  if (redis) {
    try {
      const hit = await redis.get<T>(key);
      if (hit !== null && hit !== undefined) {
        localSet(key, hit, ttl, opts.staleTtl, opts.tags);
        return hit as T;
      }
    } catch (e) {
      console.warn("[cache] get failed", key, e);
    }
  }

  const existingLoad = activeLoads.get(key);
  if (existingLoad) return existingLoad as Promise<T>;

  const load = (async () => {
    try {
      const value = await loader();
      localSet(key, value, ttl, opts.staleTtl, opts.tags);

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
    } catch (error) {
      const stale = localCache.get(key);
      if (stale && stale.staleUntil > Date.now()) {
        console.warn("[cache] serving stale value after loader failure", key);
        return stale.value as T;
      }
      throw error;
    } finally {
      activeLoads.delete(key);
    }
  })();

  activeLoads.set(key, load);
  return load;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const localHit = localFresh<T>(key);
  if (localHit !== null) return localHit;
  const redis = getRedis();
  if (!redis) return null;
  try {
    const hit = (await redis.get<T>(key)) ?? null;
    if (hit !== null) localSet(key, hit, DEFAULT_TTL);
    return hit;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttl = DEFAULT_TTL) {
  localSet(key, value, ttl);
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
  const targets = Array.isArray(keysOrTag) ? keysOrTag : [keysOrTag];
  if (asTag) {
    for (const [key, entry] of localCache) {
      if (entry.tags.some((tag) => targets.includes(tag))) localCache.delete(key);
    }
  } else {
    for (const key of targets) localCache.delete(key);
  }

  const redis = getRedis();
  if (!redis) return;
  try {
    if (asTag) {
      for (const tag of targets) {
        const members = await redis.smembers(`tag:${tag}`);
        if (members?.length) {
          await redis.del(...members, `tag:${tag}`);
        } else {
          await redis.del(`tag:${tag}`);
        }
      }
      return;
    }
    if (targets.length) await redis.del(...targets);
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
  appShell: (userId: string) => `app-shell:v1:${userId}`,
  dashboard: (userId: string) => `dashboard:v1:${userId}`,
  userAnalytics: (userId: string) => `user-analytics:v1:${userId}`,
  userProfile: (userId: string) => `user-profile:v1:${userId}`,
  notifications: (userId: string) => `notif:v1:${userId}`,
  landing: () => "landing:v1",
  health: () => "health:v1",
};

export const CacheTags = {
  analytics: "analytics",
  catalog: "catalog",
  admin: "admin",
  wallet: (userId: string) => `wallet:${userId}`,
  notifications: (userId: string) => `notif:${userId}`,
};
