"use client";

import { createContext, useContext, useMemo } from "react";
import { useRealtime, type RealtimeMessage } from "@/hooks/useRealtime";

type Ctx = {
  connected: boolean;
  lastEvent: RealtimeMessage | null;
  seq: number;
  channel: string | null;
};

const RealtimeCtx = createContext<Ctx>({
  connected: false,
  lastEvent: null,
  seq: 0,
  channel: null,
});

export function RealtimeProvider({
  channel,
  children,
  onEvent,
}: {
  channel?: string | null;
  children: React.ReactNode;
  onEvent?: (msg: RealtimeMessage) => void;
}) {
  const { connected, lastEvent, seq } = useRealtime(channel, onEvent);
  const value = useMemo(
    () => ({ connected, lastEvent, seq, channel: channel || null }),
    [connected, lastEvent, seq, channel]
  );
  return (
    <RealtimeCtx.Provider value={value}>{children}</RealtimeCtx.Provider>
  );
}

export function useRealtimeStatus() {
  return useContext(RealtimeCtx);
}

/** Live indicator for top bars */
export function RealtimeDot({ className }: { className?: string }) {
  const { connected } = useRealtimeStatus();
  return (
    <span
      className={className}
      title={connected ? "Realtime connected" : "Realtime offline"}
      aria-label={connected ? "Live" : "Offline"}
    >
      <span
        className={
          connected
            ? "inline-block h-1.5 w-1.5 rounded-full bg-green shadow-[0_0_6px_#008751]"
            : "inline-block h-1.5 w-1.5 rounded-full bg-ink/25"
        }
      />
    </span>
  );
}
