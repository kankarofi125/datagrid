"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms */
  delay?: number;
  /** once | always */
  once?: boolean;
  as?: "div" | "section" | "li" | "article";
};

/**
 * Shared Framer Motion reveal. Subtle movement keeps dense transactional
 * screens responsive and respects the user's reduced-motion preference.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  once = true,
  as: Tag = "div",
}: Props) {
  const reduced = useReducedMotion();
  const MotionTag = {
    div: motion.div,
    section: motion.section,
    li: motion.li,
    article: motion.article,
  }[Tag];

  return (
    <MotionTag
      initial={false}
      whileInView={
        reduced
          ? { opacity: 1, y: 0, scale: 1 }
          : {
              opacity: [0.86, 1],
              y: [16, 0],
              scale: [0.992, 1],
            }
      }
      viewport={{ once, amount: 0.12, margin: "0px 0px -5% 0px" }}
      transition={{
        duration: reduced ? 0 : 0.5,
        delay: reduced ? 0 : delay / 1000,
        ease: [0.16, 1, 0.3, 1],
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
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={false}
      animate={
        reduced
          ? { opacity: 1, y: 0, scale: 1 }
          : {
              opacity: [0.84, 1],
              y: [14, 0],
              scale: [0.994, 1],
            }
      }
      transition={{
        duration: reduced ? 0 : 0.46,
        delay: reduced ? 0 : delay / 1000,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
