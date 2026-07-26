import "server-only";

import { getRedis } from "@/lib/redis";

const MAX_ATTEMPTS = 5;
const WINDOW_SEC = 15 * 60; // rolling window
const LOCK_SEC = 15 * 60; // lockout duration after max failures

type FailState = {
  count: number;
  lockedUntil: number;
};

const localFails = new Map<string, FailState>();

function keyFor(phoneE164: string) {
  return `pin-fail:${phoneE164}`;
}

async function read(phoneE164: string): Promise<FailState> {
  const redis = getRedis();
  if (redis) {
    try {
      const hit = await redis.get<FailState>(keyFor(phoneE164));
      if (hit) return hit;
    } catch {
      /* fall through */
    }
  }
  return localFails.get(phoneE164) || { count: 0, lockedUntil: 0 };
}

async function write(phoneE164: string, state: FailState) {
  localFails.set(phoneE164, state);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(keyFor(phoneE164), state, { ex: WINDOW_SEC });
    } catch {
      /* local still holds */
    }
  }
}

export async function getPinLockStatus(phoneE164: string): Promise<
  | { locked: false }
  | { locked: true; retryAfterSec: number }
> {
  const state = await read(phoneE164);
  const now = Date.now();
  if (state.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSec: Math.ceil((state.lockedUntil - now) / 1000),
    };
  }
  return { locked: false };
}

export async function recordPinFailure(phoneE164: string): Promise<{
  locked: boolean;
  attemptsLeft: number;
  retryAfterSec?: number;
}> {
  const now = Date.now();
  let state = await read(phoneE164);
  if (state.lockedUntil > now) {
    return {
      locked: true,
      attemptsLeft: 0,
      retryAfterSec: Math.ceil((state.lockedUntil - now) / 1000),
    };
  }
  // Reset window if previous lock expired
  if (state.lockedUntil && state.lockedUntil <= now) {
    state = { count: 0, lockedUntil: 0 };
  }
  state.count += 1;
  if (state.count >= MAX_ATTEMPTS) {
    state.lockedUntil = now + LOCK_SEC * 1000;
    state.count = MAX_ATTEMPTS;
    await write(phoneE164, state);
    return {
      locked: true,
      attemptsLeft: 0,
      retryAfterSec: LOCK_SEC,
    };
  }
  await write(phoneE164, state);
  return {
    locked: false,
    attemptsLeft: MAX_ATTEMPTS - state.count,
  };
}

export async function clearPinFailures(phoneE164: string) {
  localFails.delete(phoneE164);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(keyFor(phoneE164));
    } catch {
      /* ignore */
    }
  }
}
