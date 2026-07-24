"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 28,
    mass: 0.24,
  });

  return (
    <motion.div
      aria-hidden
      className="scroll-progress pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-green via-amber to-green shadow-[0_1px_10px_rgba(22,134,83,.34)]"
      style={{ scaleX }}
    />
  );
}
