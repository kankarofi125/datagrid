import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-ink/[0.08]",
        className
      )}
      aria-hidden
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-paper p-3",
        className
      )}
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-6 w-28" />
      <Skeleton className="mt-2 h-3 w-full" />
    </div>
  );
}

export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-line bg-paper p-3 lg:p-4"
        >
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-3 h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between gap-3 px-3 py-2.5",
            i > 0 && "border-t border-line"
          )}
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
          <Skeleton className="h-4 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 8,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper">
      <div className="flex gap-3 border-b border-line bg-ink/[0.03] px-3 py-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-3 border-b border-line px-3 py-3 last:border-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-paper p-4",
        className
      )}
    >
      <Skeleton className="h-2.5 w-28" />
      <Skeleton className="mt-2 h-2 w-40" />
      <div className="mt-6 flex h-32 items-end gap-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${30 + ((i * 17) % 70)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonPage({
  variant = "dashboard",
}: {
  variant?: "dashboard" | "list" | "analytics" | "form" | "admin";
}) {
  if (variant === "list") {
    return (
      <div className="space-y-3 p-3 lg:p-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-32" />
        <SkeletonList rows={8} />
      </div>
    );
  }
  if (variant === "analytics") {
    return (
      <div className="space-y-4 p-3 lg:p-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-36 w-full rounded-2xl bg-green-deep/20" />
        <SkeletonKpiGrid count={4} />
        <div className="grid gap-3 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }
  if (variant === "form") {
    return (
      <div className="space-y-4 p-3 lg:p-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }
  if (variant === "admin") {
    return (
      <div className="space-y-4 p-3 lg:p-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-48" />
        <SkeletonKpiGrid count={6} />
        <SkeletonList rows={5} />
      </div>
    );
  }
  // dashboard
  return (
    <div className="space-y-3 p-3 lg:p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-16 w-full rounded-xl bg-green-deep/25" />
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-4 w-16" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-28 shrink-0 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
