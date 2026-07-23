import { getSession } from "@/lib/auth/session";
import {
  adminChannel,
  getRealtimeSeq,
  publicChannel,
  readRealtimeEvents,
  userChannel,
} from "@/lib/realtime";
import { redisEnabled } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE stream — realtime channel for clients (Vercel-compatible).
 * Query: ?channel=user:ID | admin:ops | public:grid
 */
export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  let channel = searchParams.get("channel") || publicChannel();

  // Authorize private channels
  if (channel.startsWith("user:")) {
    const uid = channel.slice(5);
    if (!session.isLoggedIn || session.userId !== uid) {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  if (channel === adminChannel()) {
    if (
      !session.isLoggedIn ||
      (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")
    ) {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  // Default personal channel if "me"
  if (channel === "me") {
    if (!session.userId) return new Response("Unauthorized", { status: 401 });
    channel = userChannel(session.userId);
  }

  const encoder = new TextEncoder();
  let closed = false;
  let lastSeq = await getRealtimeSeq(channel);
  const seen = new Set<string>();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send("ready", {
        channel,
        redis: redisEnabled(),
        at: new Date().toISOString(),
      });

      const tick = async () => {
        if (closed) return;
        try {
          const seq = await getRealtimeSeq(channel);
          if (seq !== lastSeq) {
            lastSeq = seq;
            send("seq", { seq });
            const events = await readRealtimeEvents(channel, 15);
            for (const ev of events.reverse()) {
              const id = `${ev.at}:${ev.type}:${JSON.stringify(ev.payload || {})}`;
              if (seen.has(id)) continue;
              seen.add(id);
              if (seen.size > 200) {
                const first = seen.values().next().value;
                if (first) seen.delete(first);
              }
              send("event", ev);
            }
          } else {
            send("ping", { t: Date.now(), redis: redisEnabled() });
          }
        } catch {
          send("error", { message: "poll failed" });
        }
      };

      // initial backlog
      void (async () => {
        const events = await readRealtimeEvents(channel, 10);
        for (const ev of events.reverse()) {
          send("event", ev);
        }
      })();

      const interval = setInterval(() => void tick(), 2000);

      const cleanup = () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* */
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
