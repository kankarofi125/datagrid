"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RealtimeMessage = {
  type: string;
  payload?: Record<string, unknown>;
  at: string;
};

/**
 * Server-Sent Events client (Vercel-friendly "websocket" alternative).
 * Connects to /api/realtime/stream?channel=…
 */
export function useRealtime(
  channel: string | null | undefined,
  onEvent?: (msg: RealtimeMessage) => void
) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeMessage | null>(null);
  const [seq, setSeq] = useState(0);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!channel || typeof window === "undefined") return;

    const url = `/api/realtime/stream?channel=${encodeURIComponent(channel)}`;
    const es = new EventSource(url);

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener("ready", () => setConnected(true));

    es.addEventListener("event", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as RealtimeMessage;
        setLastEvent(data);
        handler.current?.(data);
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
  }, [channel]);

  return { connected, lastEvent, seq };
}

/** Refetch callback when realtime seq advances or matching event types arrive */
export function useRealtimeRefresh(
  channel: string | null | undefined,
  refresh: () => void,
  types?: string[]
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

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
