import "server-only";

import { getRedis } from "@/lib/redis";

/**
 * Generic login attempt lockout (PIN, admin password, etc.).
 * Keys are namespaced so customer PIN and admin password don't share counters.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_SEC = 15 * 60;
const LOCK_SEC = 15 * 60;

type FailState = {
  count: number;
  lockedUntil: number;
};

const localFails = new Map<string, FailState>();

function fullKey(namespace: string, id: string) {
  return `login-fail:${namespace}:${id}`;
}

async function read(namespace: string, id: string): Promise<FailState> {
  const key = fullKey(namespace, id);
  const redis = getRedis();
  if (redis) {
    try {
      const hit = await redis.get<FailState>(key);
      if (hit) return hit;
    } catch {
      /* fall through */
    }
  }
  return localFails.get(key) || { count: 0, lockedUntil: 0 };
}

async function write(namespace: string, id: string, state: FailState) {
  const key = fullKey(namespace, id);
  localFails.set(key, state);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, state, { ex: WINDOW_SEC });
    } catch {
      /* local still holds */
    }
  }
}

export async function getLoginLockStatus(
  namespace: string,
  id: string
): Promise<{ locked: false } | { locked: true; retryAfterSec: number }> {
  const state = await read(namespace, id);
  const now = Date.now();
  if (state.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSec: Math.ceil((state.lockedUntil - now) / 1000),
    };
  }
  return { locked: false };
}

export async function recordLoginFailure(
  namespace: string,
  id: string
): Promise<{
  locked: boolean;
  attemptsLeft: number;
  retryAfterSec?: number;
}> {
  const now = Date.now();
  let state = await read(namespace, id);
  if (state.lockedUntil > now) {
    return {
      locked: true,
      attemptsLeft: 0,
      retryAfterSec: Math.ceil((state.lockedUntil - now) / 1000),
    };
  }
  if (state.lockedUntil && state.lockedUntil <= now) {
    state = { count: 0, lockedUntil: 0 };
  }
  state.count += 1;
  if (state.count >= MAX_ATTEMPTS) {
    state.lockedUntil = now + LOCK_SEC * 1000;
    state.count = MAX_ATTEMPTS;
    await write(namespace, id, state);
    return {
      locked: true,
      attemptsLeft: 0,
      retryAfterSec: LOCK_SEC,
    };
  }
  await write(namespace, id, state);
  return {
    locked: false,
    attemptsLeft: MAX_ATTEMPTS - state.count,
  };
}

export async function clearLoginFailures(namespace: string, id: string) {
  const key = fullKey(namespace, id);
  localFails.delete(key);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      /* ignore */
    }
  }
}

/** PIN login convenience wrappers (same counters as before). */
export async function getPinLockStatus(phoneE164: string) {
  return getLoginLockStatus("pin", phoneE164);
}
export async function recordPinFailure(phoneE164: string) {
  return recordLoginFailure("pin", phoneE164);
}
export async function clearPinFailures(phoneE164: string) {
  return clearLoginFailures("pin", phoneE164);
}
