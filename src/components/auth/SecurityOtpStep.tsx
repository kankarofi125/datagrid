"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { DigitField } from "@/components/ui/DigitField";
import { cn } from "@/lib/cn";

function formatCountdown(totalSec: number) {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

type Props = {
  title?: string;
  description: string;
  destinationHint?: string | null;
  /** Called after code verified successfully */
  onVerified: () => void;
  onCancel?: () => void;
  /** Resend OTP */
  onResend: () => Promise<{
    ok: boolean;
    error?: string;
    expiresInSec?: number;
    destinationHint?: string;
  }>;
  /** Verify code */
  onVerify: (code: string) => Promise<{ ok: boolean; error?: string }>;
  initialExpiresInSec?: number;
  className?: string;
};

/**
 * Shared OTP entry step for security flows (PIN reset, email verify).
 * Countdown, resend, auto-friendly digit field.
 */
export function SecurityOtpStep({
  title = "Enter verification code",
  description,
  destinationHint,
  onVerified,
  onCancel,
  onResend,
  onVerify,
  initialExpiresInSec = 120,
  className,
}: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(
    () => Date.now() + initialExpiresInSec * 1000
  );
  const [remaining, setRemaining] = useState(initialExpiresInSec);
  const [pending, start] = useTransition();

  useEffect(() => {
    const tick = () => {
      setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  function restartCountdown(sec?: number) {
    const s = typeof sec === "number" && sec > 0 ? sec : 120;
    setExpiresAt(Date.now() + s * 1000);
    setRemaining(s);
  }

  function submit() {
    if (code.length < 4) return;
    start(async () => {
      setError(null);
      setMessage(null);
      const result = await onVerify(code);
      if (!result.ok) {
        setError(result.error || "Incorrect code");
        setCode("");
        return;
      }
      onVerified();
    });
  }

  function resend() {
    start(async () => {
      setError(null);
      setMessage(null);
      const result = await onResend();
      if (!result.ok) {
        setError(result.error || "Could not resend code");
        return;
      }
      setCode("");
      restartCountdown(result.expiresInSec);
      setMessage(
        result.destinationHint
          ? `New code sent to ${result.destinationHint}`
          : "New code sent"
      );
    });
  }

  const expired = remaining <= 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink/55">{description}</p>
        {destinationHint && (
          <p className="font-mono-num mt-2 text-xs text-green">
            Sent to {destinationHint}
          </p>
        )}
      </div>

      <DigitField
        label="Verification code"
        length={6}
        value={code}
        onChange={setCode}
        autoFocus
        disabled={pending || expired}
        hint={
          expired
            ? "Code expired — resend a new one"
            : `Expires in ${formatCountdown(remaining)}`
        }
        error={error || undefined}
        aria-label="Verification code"
      />

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          fullWidth
          disabled={pending || code.length < 6 || expired}
          onClick={submit}
        >
          {pending ? "Checking…" : expired ? "Code expired" : "Verify code"}
        </Button>
        <button
          type="button"
          className="font-mono-num text-center text-xs tracking-wide text-green disabled:opacity-40"
          disabled={pending}
          onClick={resend}
        >
          Resend code
        </button>
        {onCancel && (
          <button
            type="button"
            className="font-mono-num text-center text-xs tracking-wide text-ink/40"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>

      {message && (
        <p className="text-sm text-green" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

/** Compact progress rail for multi-step security wizards */
export function SecurityStepRail({
  steps,
  activeIndex,
}: {
  steps: string[];
  activeIndex: number;
}) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              className={cn(
                "font-mono-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                done || active
                  ? "bg-green text-white"
                  : "border border-line text-ink/35"
              )}
            >
              {done ? "✓" : String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "font-mono-num truncate text-[9px] tracking-wide",
                active ? "text-ink" : "text-ink/35"
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px min-w-[8px] flex-1",
                  done ? "bg-green" : "bg-line"
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
