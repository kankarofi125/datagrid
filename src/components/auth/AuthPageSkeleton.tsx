/**
 * Instant route placeholder for login/signup.
 * Matches AuthShell layout so navigation never flashes empty white.
 */
export function AuthPageSkeleton({
  /** When true, only the form column (used under TopUtilityStrip + Suspense). */
  compact = false,
}: {
  compact?: boolean;
} = {}) {
  if (compact) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 pb-8 pt-5 lg:mx-0 lg:max-w-none lg:px-0 lg:pt-0">
        <div className="lg:mx-auto lg:flex lg:min-h-[calc(100dvh-6rem)] lg:max-w-6xl lg:items-center lg:justify-end lg:px-10">
          <div className="w-full lg:max-w-[400px]">
            <div className="h-3 w-28 rounded bg-green/15" />
            <div className="mt-3 h-9 w-[70%] rounded-lg bg-ink/[0.08]" />
            <div className="mt-3 h-4 w-full max-w-xs rounded bg-ink/[0.05]" />
            <div className="mt-5 h-16 w-full rounded-2xl border border-line bg-white" />
            <div className="mt-5 h-64 w-full rounded-[22px] border border-line bg-white shadow-[0_18px_48px_-28px_rgba(14,33,26,0.2)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-2.5rem)] bg-grid-paper">
      {/* Mobile */}
      <div className="mx-auto w-full max-w-lg px-4 pb-8 pt-5 lg:hidden">
        <div className="h-10 w-14 rounded-lg bg-ink/[0.06]" />
        <div className="mt-7 h-3 w-28 rounded bg-green/15" />
        <div className="mt-3 h-9 w-[70%] rounded-lg bg-ink/[0.08]" />
        <div className="mt-3 h-4 w-full max-w-xs rounded bg-ink/[0.05]" />
        <div className="mt-5 h-16 w-full rounded-2xl border border-line bg-white" />
        <div className="mt-5 h-64 w-full rounded-[22px] border border-line bg-white shadow-[0_18px_48px_-28px_rgba(14,33,26,0.2)]" />
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden min-h-[calc(100dvh-3rem)] max-w-6xl lg:grid lg:grid-cols-2">
        <div className="bg-grid bg-grid-live" />
        <div className="flex flex-col justify-center bg-[linear-gradient(180deg,#f8f6f0_0%,#f0ebe1_100%)] px-10 py-12">
          <div className="mx-auto w-full max-w-[400px]">
            <div className="h-9 w-[65%] rounded-lg bg-ink/[0.08]" />
            <div className="mt-3 h-4 w-full rounded bg-ink/[0.05]" />
            <div className="mt-6 h-16 w-full rounded-2xl border border-line bg-white" />
            <div className="mt-6 h-72 w-full rounded-[22px] border border-line bg-white shadow-[0_24px_60px_-36px_rgba(14,33,26,0.25)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
