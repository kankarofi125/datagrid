"use client";

import { RouteErrorPanel } from "@/components/ui/RouteErrorPanel";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorPanel
      error={error}
      reset={reset}
      homeHref="/admin"
      homeLabel="Admin overview"
    />
  );
}
