"use client";

import { useId } from "react";
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
 * Normal-height branded digit field.
 * Placeholder shows underscores (_ _ _ …); value is plain digits.
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
  const digits = value.replace(/\D/g, "").slice(0, length);
  const placeholder = Array.from({ length }, () => "_").join(" ");

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className="font-mono-num flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink/70"
        >
          <span className="inline-block h-3 w-0.5 rounded-full bg-green" aria-hidden />
          {label}
        </label>
      )}
      <input
        id={id}
        type={masked ? "password" : "text"}
        inputMode={inputMode}
        autoComplete={masked ? "off" : "one-time-code"}
        autoFocus={autoFocus}
        disabled={disabled}
        value={digits}
        maxLength={length}
        placeholder={placeholder}
        aria-label={ariaLabel || label || "Digit entry"}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-11 w-full rounded-lg border border-green/40 bg-paper px-3 text-base text-ink",
          "font-mono-num tracking-[0.2em]",
          "placeholder:tracking-[0.2em] placeholder:text-ink/25",
          "outline-none ring-0",
          "focus:border-green focus:outline-none focus:ring-0",
          error && "border-danger focus:border-danger",
          disabled && "opacity-60"
        )}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
      />
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
