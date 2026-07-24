"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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
 * Shared viewport reveal. It deliberately starts away from the final state so
 * IntersectionObserver-driven `whileInView` motion remains visible.
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
  const reduced = useReducedMotion();
  const MotionTag = {
    div: motion.div,
    section: motion.section,
    li: motion.li,
    article: motion.article,
  }[Tag];
  const offset = {
    up: { x: 0, y: distance },
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
    none: { x: 0, y: 0 },
  }[direction];

  return (
    <MotionTag
      data-motion-owned
      initial={
        reduced
          ? false
          : {
              opacity: 0,
              x: offset.x,
              y: offset.y,
              scale: 0.985,
              filter: "blur(8px)",
            }
      }
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once, amount: 0.18, margin: "0px 0px -9% 0px" }}
      transition={{
        duration: reduced ? 0 : 0.72,
        delay: reduced ? 0 : delay / 1000,
        ease: PREMIUM_EASE,
      }}
      style={{ willChange: reduced ? "auto" : "transform, opacity, filter" }}
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
  const reduced = useReducedMotion();

  return (
    <motion.div
      data-motion-owned
      initial={
        reduced
          ? false
          : {
              opacity: 0,
              y: 24,
              scale: 0.99,
              filter: "blur(7px)",
            }
      }
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{
        duration: reduced ? 0 : 0.78,
        delay: reduced ? 0 : delay / 1000,
        ease: PREMIUM_EASE,
      }}
      style={{ willChange: reduced ? "auto" : "transform, opacity, filter" }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
