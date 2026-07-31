"use client";

import { cn } from "@/lib/cn";
import { BalanceAmount } from "@/components/ui/BalanceAmount";
import { useBalanceHidden } from "@/hooks/useBalanceHidden";

/** Standard outline eye (Heroicons / common web password-toggle style). */
function EyeOpenIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .638C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
      <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

/** Standard eye-slash when balance is hidden. */
function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
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
        // Compact ghost control — no large white disc
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent transition pressable",
        "text-current opacity-70 hover:opacity-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green/40",
        className
      )}
    >
      {hidden ? (
        <EyeOffIcon className={cn("h-4 w-4", iconClassName)} />
      ) : (
        <EyeOpenIcon className={cn("h-4 w-4", iconClassName)} />
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
        "flex min-w-0 items-center gap-1.5",
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
      <BalanceEyeButton className={eyeClassName} />
    </div>
  );
}
