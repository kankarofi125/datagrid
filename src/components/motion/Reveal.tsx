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
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.12, margin: "0px 0px -5% 0px" }}
      transition={{
        duration: reduced ? 0 : 0.42,
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
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : 0.38,
        delay: reduced ? 0 : delay / 1000,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
