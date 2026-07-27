"use client";

import type { ReactNode } from "react";

/**
 * Step content wrapper for auth wizards.
 *
 * Previous Framer enter/exit (opacity 0, blur, AnimatePresence wait) caused a
 * white flash between phone ↔ OTP ↔ PIN. Instant swap is the most stable;
 * the progress rail already signals step change.
 */
export function AuthStepTransition({
  stepKey,
  children,
}: {
  stepKey: string;
  children: ReactNode;
}) {
  return <div key={stepKey}>{children}</div>;
}
