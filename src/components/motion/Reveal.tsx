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
 * Scroll-triggered reveal. Server and client both start from the same initial
 * motion styles so hydration stays aligned. Marked data-motion-owned so the
 * app MotionCascade does not double-animate.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  once = true,
  as: Tag = "div",
  direction = "up",
  distance = 28,
}: Props) {
  const reduced = useReducedMotion() === true;
  const offset = {
    up: { x: 0, y: distance },
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
    none: { x: 0, y: 0 },
  }[direction];

  if (reduced) {
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
        scale: direction === "none" ? 1 : 0.985,
        filter: "blur(8px)",
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      }}
      viewport={{ once, amount: 0.14, margin: "0px 0px -6% 0px" }}
      transition={{
        duration: 0.7,
        delay: delay / 1000,
        ease: PREMIUM_EASE,
      }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/** Hero load sequence — orchestrated entrance on mount, not scroll */
export function HeroEnter({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion() === true;

  if (reduced) {
    return (
      <div data-motion-owned className={cn(className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      data-motion-owned
      initial={{ opacity: 0, y: 22, scale: 0.99, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{
        duration: 0.75,
        delay: delay / 1000,
        ease: PREMIUM_EASE,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
