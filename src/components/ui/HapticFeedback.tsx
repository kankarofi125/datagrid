"use client";

import { useEffect } from "react";
import { triggerHaptic, type HapticKind } from "@/lib/haptics";

const HAPTIC_KINDS = new Set<HapticKind>([
  "tap",
  "key",
  "navigation",
  "success",
  "error",
]);

export function HapticFeedback() {
  useEffect(() => {
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const control = target.closest<HTMLElement>(
        'button, [role="button"], [data-haptic]'
      );
      if (!control || control.dataset.haptic === "none") return;
      if (
        (control instanceof HTMLButtonElement && control.disabled) ||
        control.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }

      const requested = control.dataset.haptic;
      const kind =
        requested && HAPTIC_KINDS.has(requested as HapticKind)
          ? (requested as HapticKind)
          : "tap";
      triggerHaptic(kind);
    };

    document.addEventListener("pointerup", onPointerUp, { passive: true });
    return () => document.removeEventListener("pointerup", onPointerUp);
  }, []);

  return null;
}
