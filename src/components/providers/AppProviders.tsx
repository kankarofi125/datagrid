"use client";

import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";

/**
 * Client providers for authenticated app shell.
 * channel "me" resolves to the logged-in user on the SSE endpoint.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <RealtimeProvider channel="me">{children}</RealtimeProvider>;
}

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider channel="admin:ops">{children}</RealtimeProvider>
  );
}
