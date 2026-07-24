import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-md bg-ink/[0.075]",
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
        "rounded-xl border border-line bg-white p-3",
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
      <div className="space-y-3 px-3.5 py-4 lg:p-6" aria-busy="true" aria-label="Loading">
        <span className="sr-only">Loading page</span>
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-7 w-36" />
        <SkeletonList rows={6} />
      </div>
    );
  }
  if (variant === "analytics") {
    return (
      <div className="space-y-3.5 px-3.5 py-4 lg:p-6" aria-busy="true" aria-label="Loading">
        <span className="sr-only">Loading analytics</span>
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
      <div className="px-3.5 py-4 lg:p-6" aria-busy="true" aria-label="Loading form">
        <span className="sr-only">Loading form</span>
        <Skeleton className="h-2.5 w-14" />
        <Skeleton className="mt-2 h-7 w-36" />
        <div className="mt-4 space-y-3 rounded-2xl border border-line bg-white p-3.5 lg:max-w-xl lg:p-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="mb-1.5 h-2.5 w-20" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
          <Skeleton className="h-11 w-full rounded-xl bg-green/15" />
        </div>
      </div>
    );
  }
  if (variant === "admin") {
    return (
      <div className="space-y-4 px-3.5 py-4 lg:p-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-48" />
        <SkeletonKpiGrid count={6} />
        <SkeletonList rows={5} />
      </div>
    );
  }
  // dashboard
  return (
    <div className="space-y-3 px-3.5 py-3.5 lg:p-6" aria-busy="true" aria-label="Loading dashboard">
      <span className="sr-only">Loading dashboard</span>
      <Skeleton className="h-[112px] w-full rounded-[18px] bg-green-deep/20" />
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[66px] rounded-[14px]" />
        ))}
      </div>
      <Skeleton className="h-4 w-16" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-32 shrink-0 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[124px] rounded-[16px]" />
        ))}
      </div>
    </div>
  );
}

export function LoadFailure({
  title = "Couldn’t load this page",
  message = "Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-3.5 py-4 lg:p-6" role="alert">
      <div className="rounded-2xl border border-danger/15 bg-white p-4 lg:max-w-xl">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger/[0.07] text-sm font-bold text-danger">
          !
        </span>
        <h1 className="mt-3 text-base font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-ink/50">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="pressable mt-4 min-h-11 rounded-xl bg-green px-4 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
