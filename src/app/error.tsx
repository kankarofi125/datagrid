"use client";

import { RouteErrorPanel } from "@/components/ui/RouteErrorPanel";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorPanel error={error} reset={reset} />;
}
