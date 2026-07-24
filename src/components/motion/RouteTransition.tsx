"use client";

import { motion, useReducedMotion } from "framer-motion";

const PREMIUM_EASE = [0.16, 1, 0.3, 1] as const;

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={
        reduced
          ? false
          : {
              opacity: 0,
              y: 12,
              scale: 0.997,
              filter: "blur(4px)",
            }
      }
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{
        duration: reduced ? 0 : 0.52,
        ease: PREMIUM_EASE,
      }}
      style={{ willChange: reduced ? "auto" : "transform, opacity, filter" }}
    >
      {children}
    </motion.div>
  );
}
