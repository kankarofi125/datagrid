"use client";

import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function PinPad({
  value,
  onChange,
  maxLength = 4,
  disabled,
  denied = false,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  disabled?: boolean;
  denied?: boolean;
}) {
  const controls = useAnimationControls();
  const reduced = useReducedMotion();
  const [showDenial, setShowDenial] = useState(false);

  useEffect(() => {
    if (!denied) {
      const frame = window.requestAnimationFrame(() => setShowDenial(false));
      return () => window.cancelAnimationFrame(frame);
    }

    const frame = window.requestAnimationFrame(() => {
      setShowDenial(true);
      if (!reduced) {
        void controls.start({
          x: [0, -9, 8, -6, 5, -3, 0],
          transition: { duration: 0.42, ease: "easeOut" },
        });
      }
    });

    const clearPin = window.setTimeout(() => onChange(""), 180);
    const clearState = window.setTimeout(() => setShowDenial(false), 900);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(clearPin);
      window.clearTimeout(clearState);
    };
  }, [controls, denied, onChange, reduced]);

  function press(k: string) {
    if (disabled) return;
    if (k === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (k === "") return;
    if (value.length >= maxLength) return;
    onChange(value + k);
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
            disabled={disabled || k === ""}
            onClick={() => press(k)}
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
