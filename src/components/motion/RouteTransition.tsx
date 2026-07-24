"use client";

import { motion, useReducedMotion } from "framer-motion";

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={false}
      animate={
        reduced
          ? { opacity: 1, y: 0, scale: 1 }
          : {
              opacity: [0.88, 1],
              y: [10, 0],
              scale: [0.997, 1],
            }
      }
      transition={{
        duration: reduced ? 0 : 0.38,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
