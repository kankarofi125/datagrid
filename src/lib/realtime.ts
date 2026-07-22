import { getRedis } from "@/lib/redis";

export type RealtimeEvent = {
  type: string;
  payload?: Record<string, unknown>;
  at: string;
};

const channelKey = (channel: string) => `rt:ch:${channel}`;

/**
 * Publish an event onto a Redis list channel (works with REST).
 * Subscribers poll via SSE /api/realtime/stream?channel=…
 */
export async function publishRealtime(
  channel: string,
  type: string,
  payload?: Record<string, unknown>
) {
  const redis = getRedis();
  if (!redis) return;
  const event: RealtimeEvent = {
    type,
    payload,
    at: new Date().toISOString(),
  };
  try {
    const key = channelKey(channel);
    await redis.lpush(key, JSON.stringify(event));
    await redis.ltrim(key, 0, 99);
    await redis.expire(key, 60 * 60);
    // bump sequence so clients can detect new data without full scan
    await redis.incr(`rt:seq:${channel}`);
  } catch (e) {
    console.warn("[realtime] publish failed", channel, e);
  }
}

export async function getRealtimeSeq(channel: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    const n = await redis.get<number>(`rt:seq:${channel}`);
    return Number(n || 0);
  } catch {
    return 0;
  }
}

export async function readRealtimeEvents(
  channel: string,
  limit = 20
): Promise<RealtimeEvent[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.lrange<string>(channelKey(channel), 0, limit - 1);
    return (raw || [])
      .map((item) => {
        try {
          return typeof item === "string" ? (JSON.parse(item) as RealtimeEvent) : (item as RealtimeEvent);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as RealtimeEvent[];
  } catch {
    return [];
  }
}

export function userChannel(userId: string) {
  return `user:${userId}`;
}

export function adminChannel() {
  return "admin:ops";
}

export function publicChannel() {
  return "public:grid";
}
