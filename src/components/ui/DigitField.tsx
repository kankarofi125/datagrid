"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/cn";

type Props = {
  label?: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  length: number;
  /** Mask filled digits (for PIN) */
  masked?: boolean;
  inputMode?: "numeric" | "tel";
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

/**
 * Branded digit entry with underscore placeholders (_).
 * One cell per digit — empty shows "_".
 */
export function DigitField({
  label,
  hint,
  error,
  value,
  onChange,
  length,
  masked = false,
  inputMode = "numeric",
  autoFocus,
  disabled,
  className,
  id: idProp,
  "aria-label": ariaLabel,
}: Props) {
  const autoId = useId();
  const id = idProp || autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const digits = value.replace(/\D/g, "").slice(0, length);

  function handleChange(raw: string) {
    const next = raw.replace(/\D/g, "").slice(0, length);
    onChange(next);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label
          htmlFor={id}
          className="font-mono-num flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink/70"
        >
          <span className="inline-block h-3 w-0.5 rounded-full bg-green" aria-hidden />
          {label}
        </label>
      )}

      <div
        className={cn(
          "relative cursor-text rounded-xl border-2 border-green/20 bg-green-deep/[0.03] p-3 sm:p-3.5",
          "shadow-[inset_0_1px_0_rgba(255,255,255,.6)]",
          "focus-within:border-green focus-within:ring-2 focus-within:ring-green/20",
          error && "border-danger focus-within:border-danger focus-within:ring-danger/20",
          disabled && "opacity-60"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <div
          className="pointer-events-none flex flex-wrap justify-center gap-1.5 sm:gap-2"
          aria-hidden
        >
          {Array.from({ length }).map((_, i) => {
            const filled = i < digits.length;
            const ch = filled ? (masked ? "•" : digits[i]) : "_";
            const isCursor = i === digits.length && !disabled;
            return (
              <span
                key={i}
                className={cn(
                  "font-mono-num flex h-10 w-7 items-center justify-center rounded-md text-lg font-semibold sm:h-11 sm:w-8 sm:text-xl",
                  filled
                    ? "bg-green-deep text-paper"
                    : "bg-paper text-ink/25 ring-1 ring-inset ring-line",
                  isCursor && "ring-2 ring-green text-green/40"
                )}
              >
                {ch}
              </span>
            );
          })}
        </div>

        <input
          ref={inputRef}
          id={id}
          type={masked ? "password" : "text"}
          inputMode={inputMode}
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          disabled={disabled}
          value={digits}
          maxLength={length}
          aria-label={ariaLabel || label || "Digit entry"}
          aria-invalid={Boolean(error)}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="font-mono-num text-[11px] text-ink/50">{hint}</p>
      ) : null}
    </div>
  );
}
