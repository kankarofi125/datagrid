"use client";

import {
  useEffect,
  useId,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
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
  /**
   * Force single-line input (e.g. phone). Default: multi-cell boxes when
   * length is 4–8 (OTP / PIN), single field otherwise.
   */
  variant?: "auto" | "boxes" | "field";
};

/**
 * Digit entry for OTP / PIN / short codes.
 * When length is 4–8, renders one box per digit so the UI matches code length.
 * Longer values (e.g. phone) use a single field.
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
  variant = "auto",
}: Props) {
  const autoId = useId();
  const id = idProp || autoId;
  const digits = value.replace(/\D/g, "").slice(0, length);
  const useBoxes =
    variant === "boxes" ||
    (variant === "auto" && length >= 4 && length <= 8 && inputMode === "numeric");

  if (useBoxes) {
    return (
      <DigitBoxes
        id={id}
        label={label}
        hint={hint}
        error={error}
        digits={digits}
        length={length}
        masked={masked}
        inputMode={inputMode}
        autoFocus={autoFocus}
        disabled={disabled}
        className={className}
        ariaLabel={ariaLabel || label || "Digit entry"}
        onChange={onChange}
      />
    );
  }

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
          "h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink shadow-[0_1px_0_rgba(14,33,26,.02)]",
          "font-mono-num tracking-[0.2em]",
          "placeholder:tracking-[0.2em] placeholder:text-ink/25",
          "outline-none ring-0",
          "focus:border-green focus:outline-none focus:ring-2 focus:ring-green/10",
          error && "border-danger focus:border-danger focus:ring-danger/10",
          disabled && "opacity-60"
        )}
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, "").slice(0, length))
        }
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

function DigitBoxes({
  id,
  label,
  hint,
  error,
  digits,
  length,
  masked,
  inputMode,
  autoFocus,
  disabled,
  className,
  ariaLabel,
  onChange,
}: {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  digits: string;
  length: number;
  masked: boolean;
  inputMode: "numeric" | "tel";
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
  onChange: (value: string) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const idx = Math.min(digits.length, length - 1);
    const t = window.setTimeout(() => refs.current[idx]?.focus(), 40);
    return () => window.clearTimeout(t);
    // Focus once when the field mounts / becomes enabled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, disabled]);

  function applyValue(next: string, focusIndex?: number) {
    const cleaned = next.replace(/\D/g, "").slice(0, length);
    onChange(cleaned);
    if (typeof focusIndex === "number") {
      window.requestAnimationFrame(() => {
        refs.current[Math.max(0, Math.min(focusIndex, length - 1))]?.focus();
      });
    }
  }

  function handleChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      applyValue(digits.slice(0, index) + digits.slice(index + 1), index);
      return;
    }
    // Multi-digit (paste or autofill into one cell) fills from this index
    if (cleaned.length > 1) {
      const merged = (digits.slice(0, index) + cleaned)
        .replace(/\D/g, "")
        .slice(0, length);
      applyValue(merged, Math.min(merged.length, length - 1));
      return;
    }
    if (index > digits.length) {
      applyValue((digits + cleaned).slice(0, length), digits.length);
      return;
    }
    const next = (
      digits.slice(0, index) +
      cleaned +
      digits.slice(index + 1)
    )
      .replace(/\D/g, "")
      .slice(0, length);
    applyValue(next, Math.min(index + 1, length - 1));
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        applyValue(digits.slice(0, index) + digits.slice(index + 1), index);
      } else if (index > 0) {
        applyValue(
          digits.slice(0, index - 1) + digits.slice(index),
          index - 1
        );
      }
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;
    applyValue(pasted, Math.min(pasted.length, length - 1));
  }

  const gapClass = length >= 6 ? "gap-1.5 sm:gap-2" : "gap-2";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span
          id={`${id}-label`}
          className="font-mono-num flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink/70"
        >
          <span
            className="inline-block h-3 w-0.5 rounded-full bg-green"
            aria-hidden
          />
          {label}
        </span>
      )}
      <div
        role="group"
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-label={label ? undefined : ariaLabel}
        className={cn("flex w-full justify-between", gapClass)}
      >
        {Array.from({ length }).map((_, i) => {
          const char = digits[i] || "";
          const filled = Boolean(char);
          return (
            <input
              key={`${id}-${i}`}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={i === 0 ? id : `${id}-${i}`}
              type="text"
              inputMode={inputMode}
              autoComplete={i === 0 && !masked ? "one-time-code" : "off"}
              autoFocus={autoFocus && i === 0}
              disabled={disabled}
              value={masked && filled ? "•" : char}
              maxLength={length}
              aria-label={`${ariaLabel}, digit ${i + 1} of ${length}`}
              aria-invalid={Boolean(error)}
              className={cn(
                "h-12 min-w-0 flex-1 rounded-xl border bg-white text-center font-mono-num text-lg font-semibold text-ink",
                "shadow-[0_1px_0_rgba(14,33,26,.02)] outline-none transition-colors",
                "focus:border-green focus:ring-2 focus:ring-green/10",
                filled ? "border-green/25" : "border-line",
                error &&
                  "border-danger focus:border-danger focus:ring-danger/10",
                disabled && "opacity-60"
              )}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
            />
          );
        })}
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
