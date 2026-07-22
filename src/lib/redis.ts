import { Redis } from "@upstash/redis";

/**
 * Upstash Redis (REST). Safe on Vercel serverless.
 * Falls back to null when env is missing so local dev still works.
 */
let redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redis = null;
    return redis;
  }
  redis = new Redis({ url, token });
  return redis;
}

export function redisEnabled() {
  return Boolean(getRedis());
}
