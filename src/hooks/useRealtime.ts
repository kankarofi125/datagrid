"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RealtimeMessage = {
  type: string;
  payload?: Record<string, unknown>;
  at: string;
};

type Envelope = {
  type: string;
  data?: unknown;
  payload?: Record<string, unknown>;
  at?: string;
};

function resolveChannel(channel: string): string {
  // "me" is resolved server-side on SSE; for WS we keep as-is until client knows userId
  return channel;
}

/**
 * Prefer dedicated WebSocket gateway (Fly/Railway) when
 * NEXT_PUBLIC_REALTIME_WS_URL is set; otherwise SSE on Vercel.
 */
export function useRealtime(
  channel: string | null | undefined,
  onEvent?: (msg: RealtimeMessage) => void
) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeMessage | null>(null);
  const [seq, setSeq] = useState(0);
  const handler = useRef(onEvent);
  const wsBase = process.env.NEXT_PUBLIC_REALTIME_WS_URL;
  const transport: "ws" | "sse" | "none" = channel
    ? wsBase
      ? "ws"
      : "sse"
    : "none";

  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!channel || typeof window === "undefined") return;

    let cleaned = false;

    const emitEvent = (msg: RealtimeMessage) => {
      setLastEvent(msg);
      handler.current?.(msg);
    };

    // —— WebSocket path ——
    if (wsBase) {
      const ch = resolveChannel(channel);
      const url = `${wsBase.replace(/\/$/, "")}/?channel=${encodeURIComponent(ch)}`;
      let ws: WebSocket | null = null;
      let retry: ReturnType<typeof setTimeout> | undefined;
      let pingTimer: ReturnType<typeof setInterval> | undefined;

      const connect = () => {
        if (cleaned) return;
        ws = new WebSocket(url);

        ws.onopen = () => {
          setConnected(true);
          pingTimer = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 20000);
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as Envelope;
            if (msg.type === "ready" || msg.type === "pong" || msg.type === "ping") {
              setConnected(true);
              return;
            }
            if (msg.type === "event" && msg.data && typeof msg.data === "object") {
              const data = msg.data as RealtimeMessage;
              if (data.type) emitEvent(data);
              return;
            }
            // bare RealtimeMessage shape
            if (msg.at && msg.type) {
              emitEvent({
                type: msg.type,
                payload: msg.payload,
                at: msg.at,
              });
            }
          } catch {
            /* ignore */
          }
        };

        ws.onerror = () => setConnected(false);
        ws.onclose = () => {
          setConnected(false);
          if (pingTimer) clearInterval(pingTimer);
          if (!cleaned) retry = setTimeout(connect, 2500);
        };
      };

      connect();

      return () => {
        cleaned = true;
        if (retry) clearTimeout(retry);
        if (pingTimer) clearInterval(pingTimer);
        ws?.close();
        setConnected(false);
      };
    }

    // —— SSE fallback (Vercel) ——
    const url = `/api/realtime/stream?channel=${encodeURIComponent(channel)}`;
    const es = new EventSource(url);

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener("ready", () => setConnected(true));
    es.addEventListener("event", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as RealtimeMessage;
        emitEvent(data);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("seq", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as { seq: number };
        setSeq(data.seq);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("ping", () => setConnected(true));

    return () => {
      es.close();
      setConnected(false);
    };
  }, [channel, wsBase]);

  return { connected, lastEvent, seq, transport };
}

/** Refetch when matching realtime events arrive */
export function useRealtimeRefresh(
  channel: string | null | undefined,
  refresh: () => void,
  types?: string[]
) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const onEvent = useCallback(
    (msg: RealtimeMessage) => {
      if (!types || types.includes(msg.type) || msg.type === "invalidate") {
        refreshRef.current();
      }
    },
    [types]
  );

  return useRealtime(channel, onEvent);
}
