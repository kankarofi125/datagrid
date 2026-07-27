"use client";

import { motion, useReducedMotion } from "framer-motion";

const PREMIUM_EASE = [0.16, 1, 0.3, 1] as const;

type Props = {
  children: React.ReactNode;
  /**
   * "soft" — slight rise only, opacity stays 1 (auth: no white flash).
   * "full" — light fade+rise for app shell navigations.
   */
  variant?: "soft" | "full";
};

/**
 * Page enter. Never drop opacity to 0 on "soft" — that blanked the paper
 * background for a frame when landing → login/signup remounted.
 *
 * Note: do NOT key this by pathname. Next.js `template.tsx` already remounts
 * the tree; re-keying would double-unmount and flash.
 */
export function RouteTransition({
  children,
  variant = "full",
}: Props) {
  const reduced = useReducedMotion() === true;

  if (reduced) {
    return <div data-motion-owned>{children}</div>;
  }

  if (variant === "soft") {
    return (
      <motion.div
        data-motion-owned
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.32, ease: PREMIUM_EASE }}
      >
        {children}
      </motion.div>
    );
  }

  // App/admin: mild fade that never fully blanks (0.88 → 1)
  return (
    <motion.div
      data-motion-owned
      initial={{ opacity: 0.88, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: PREMIUM_EASE }}
    >
      {children}
    </motion.div>
  );
}
