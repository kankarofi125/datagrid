"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useHasMounted } from "@/hooks/useHasMounted";

const PREMIUM_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Soft page enter on client navigations. SSR/hydration stay fully visible.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const mounted = useHasMounted();
  const reduced = useReducedMotion() === true;

  if (!mounted || reduced) {
    return <div data-motion-owned>{children}</div>;
  }

  return (
    <motion.div
      data-motion-owned
      initial={{ opacity: 0, y: 12, scale: 0.997, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{
        duration: 0.52,
        ease: PREMIUM_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}
