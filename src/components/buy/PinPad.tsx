"use client";

import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/haptics";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function PinPad({
  value,
  onChange,
  maxLength = 4,
  disabled,
  denied = false,
  onDeniedReset,
  /** Fires once the full PIN is entered (e.g. auto-submit a purchase). */
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  disabled?: boolean;
  denied?: boolean;
  onDeniedReset?: () => void;
  onComplete?: (pin: string) => void;
}) {
  const controls = useAnimationControls();
  const reduced = useReducedMotion();
  const [showDenial, setShowDenial] = useState(false);
  const [denialLocked, setDenialLocked] = useState(false);
  const onChangeRef = useRef(onChange);
  const onDeniedResetRef = useRef(onDeniedReset);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onChangeRef.current = onChange;
    onDeniedResetRef.current = onDeniedReset;
    onCompleteRef.current = onComplete;
  }, [onChange, onDeniedReset, onComplete]);

  useEffect(() => {
    if (!denied) {
      const frame = window.requestAnimationFrame(() => {
        setShowDenial(false);
        setDenialLocked(false);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const frame = window.requestAnimationFrame(() => {
      setShowDenial(true);
      setDenialLocked(true);
      triggerHaptic("error");
      if (!reduced) {
        void controls.start({
          x: [0, -9, 8, -6, 5, -3, 0],
          transition: { duration: 0.42, ease: "easeOut" },
        });
      }
    });

    const clearPin = window.setTimeout(() => onChangeRef.current(""), 180);
    const unlock = window.setTimeout(() => {
      setShowDenial(false);
      setDenialLocked(false);
    }, 560);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(clearPin);
      window.clearTimeout(unlock);
    };
  }, [controls, denied, reduced]);

  function press(k: string) {
    if (disabled || denialLocked) return;
    if (denied) onDeniedResetRef.current?.();
    if (k === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (k === "") return;
    if (value.length >= maxLength) return;
    const next = value + k;
    onChange(next);
    if (next.length === maxLength) {
      // Defer so parent state has the full PIN before submit handlers run.
      window.setTimeout(() => onCompleteRef.current?.(next), 0);
    }
  }

  return (
    <motion.div
      animate={controls}
      className={cn(
        "rounded-2xl border p-3 transition-colors duration-200",
        showDenial
          ? "border-danger bg-danger/[0.06] shadow-[0_0_0_3px_rgba(229,72,77,.08)]"
          : "border-transparent bg-transparent"
      )}
      aria-invalid={showDenial}
    >
      <div
        className="mb-3 flex justify-center gap-2"
        aria-label="PIN digits"
        aria-live="polite"
      >
        {Array.from({ length: maxLength }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border font-mono-num text-base font-semibold transition-colors",
              showDenial
                ? "border-danger/35 bg-white text-danger"
                : i < value.length
                  ? "border-green/20 bg-green/[0.055] text-ink"
                  : "border-line bg-white text-ink/22"
            )}
          >
            {i < value.length ? "•" : ""}
          </span>
        ))}
      </div>
      <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-2">
        {KEYS.map((k, i) => (
          <button
            key={`${k}-${i}`}
            type="button"
            disabled={disabled || denialLocked || k === ""}
            onClick={() => press(k)}
            data-haptic="key"
            className={cn(
              "pressable font-mono-num h-14 rounded-lg text-xl font-semibold",
              k === ""
                ? "invisible"
                : showDenial
                  ? "border border-danger/25 bg-white text-danger"
                  : "border border-line bg-white text-ink hover:bg-ink/5 active:bg-green/10"
            )}
            aria-label={k === "⌫" ? "Delete" : k}
          >
            {k}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
