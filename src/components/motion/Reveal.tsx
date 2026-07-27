"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useHasMounted } from "@/hooks/useHasMounted";

const PREMIUM_EASE = [0.16, 1, 0.3, 1] as const;

type Props = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms */
  delay?: number;
  /** once | always */
  once?: boolean;
  as?: "div" | "section" | "li" | "article";
  direction?: "up" | "left" | "right" | "none";
  distance?: number;
};

/**
 * Viewport reveal. Server HTML and the first client paint are plain (visible)
 * markup so React hydration always matches. Motion only activates after mount.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  once = true,
  as: Tag = "div",
  direction = "up",
  distance = 26,
}: Props) {
  const mounted = useHasMounted();
  const reduced = useReducedMotion() === true;
  const offset = {
    up: { x: 0, y: distance },
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
    none: { x: 0, y: 0 },
  }[direction];

  // SSR + hydration: static element (no framer styles → no mismatch).
  if (!mounted || reduced) {
    const StaticTag = Tag;
    return (
      <StaticTag data-motion-owned className={className}>
        {children}
      </StaticTag>
    );
  }

  const MotionTag = {
    div: motion.div,
    section: motion.section,
    li: motion.li,
    article: motion.article,
  }[Tag];

  return (
    <MotionTag
      data-motion-owned
      initial={{
        opacity: 0,
        x: offset.x,
        y: offset.y,
        scale: 0.985,
        filter: "blur(8px)",
      }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once, amount: 0.18, margin: "0px 0px -9% 0px" }}
      transition={{
        duration: 0.72,
        delay: delay / 1000,
        ease: PREMIUM_EASE,
      }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/** Hero load sequence — orchestrated entrance, not scroll */
export function HeroEnter({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const mounted = useHasMounted();
  const reduced = useReducedMotion() === true;

  if (!mounted || reduced) {
    return (
      <div data-motion-owned className={cn(className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      data-motion-owned
      initial={{ opacity: 0, y: 24, scale: 0.99, filter: "blur(7px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{
        duration: 0.78,
        delay: delay / 1000,
        ease: PREMIUM_EASE,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
