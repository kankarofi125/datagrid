"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
 * Scroll reveal: small y-shift + clip-path wipe (control-room, not AOS fade).
 * Respects prefers-reduced-motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  once = true,
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) io.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, reduced]);

  const style = {
    "--reveal-delay": `${delay}ms`,
  } as CSSProperties;

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      style={style}
      className={cn(
        "reveal-base",
        visible && "reveal-in",
        reduced && "reveal-in",
        className
      )}
    >
      {children}
    </Tag>
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
  const [on, setOn] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const t = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(t);
  }, [reduced]);

  return (
    <div
      className={cn("hero-enter", (on || reduced) && "hero-enter-on", className)}
      style={{ "--hero-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
