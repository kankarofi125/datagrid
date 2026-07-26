"use client";

import { cn } from "@/lib/cn";
import { BalanceAmount } from "@/components/ui/BalanceAmount";
import { useBalanceHidden } from "@/hooks/useBalanceHidden";

function EyeOpenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M9.9 5.2A10.5 10.5 0 0 1 12 5c6 0 9.5 7 9.5 7a16.8 16.8 0 0 1-3.2 3.9M6.1 6.1C3.9 7.7 2.5 12 2.5 12s3.5 7 9.5 7c1.4 0 2.7-.3 3.9-.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BalanceEyeButton({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  const { hidden, toggle } = useBalanceHidden();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      aria-label={hidden ? "Show balance" : "Hide balance"}
      aria-pressed={hidden}
      title={hidden ? "Show balance" : "Hide balance"}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition pressable",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green/40",
        className
      )}
    >
      {hidden ? (
        <EyeOffIcon className={cn("h-[18px] w-[18px]", iconClassName)} />
      ) : (
        <EyeOpenIcon className={cn("h-[18px] w-[18px]", iconClassName)} />
      )}
    </button>
  );
}

/**
 * Amount + eye toggle; respects the shared hide preference.
 * Eye is always vertically centered beside the amount (no stray top margin).
 */
export function BalanceWithEye({
  amount,
  variant = "hero",
  compact,
  className,
  rowClassName,
  eyeClassName,
}: {
  amount: number | string;
  variant?: "hero" | "card" | "compact";
  compact?: boolean;
  className?: string;
  rowClassName?: string;
  eyeClassName?: string;
}) {
  const { hidden } = useBalanceHidden();
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        rowClassName
      )}
    >
      <BalanceAmount
        amount={amount}
        hidden={hidden}
        variant={variant}
        compact={compact}
        className={className}
      />
      <BalanceEyeButton
        className={cn(
          "border-line bg-white/90 text-ink/60 shadow-sm hover:bg-white hover:text-ink",
          eyeClassName
        )}
      />
    </div>
  );
}
