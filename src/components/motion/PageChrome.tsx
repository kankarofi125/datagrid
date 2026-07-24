"use client";

import { cn } from "@/lib/cn";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";
import type { ReactNode } from "react";

/** Consistent outer padding for app pages (mobile + desktop) */
export function PageShell({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-full px-3.5 py-4 sm:px-6 sm:py-6",
        wide ? "lg:px-8 lg:py-8 xl:px-10" : "lg:px-8 lg:py-8 xl:px-10",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Premium page header — hero entrance on mount */
export function MotionPageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 lg:mb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-4",
        className
      )}
    >
      <div className="min-w-0">
        {kicker && (
          <HeroEnter delay={0}>
            <p className="font-mono-num text-[11px] tracking-[0.18em] text-green">
              {kicker}
            </p>
          </HeroEnter>
        )}
        <HeroEnter delay={70}>
          <h1 className="font-display mt-1.5 text-[28px] text-ink lg:text-4xl xl:text-5xl">
            {title}
          </h1>
        </HeroEnter>
        {description && (
          <HeroEnter delay={140}>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink/60 lg:mt-3 lg:text-base">
              {description}
            </p>
          </HeroEnter>
        )}
      </div>
      {actions && (
        <HeroEnter delay={180}>
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        </HeroEnter>
      )}
    </div>
  );
}

/** Mobile-style compact header (same motion language) */
export function MotionMobileHeader({
  kicker,
  title,
  trailing,
  className,
}: {
  kicker?: string;
  title: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div>
        {kicker && (
          <HeroEnter delay={0}>
            <p className="font-mono-num text-[11px] tracking-[0.16em] text-ink/45">
              {kicker}
            </p>
          </HeroEnter>
        )}
        <HeroEnter delay={60}>
          <h1 className="font-display mt-1 text-[26px] text-ink">{title}</h1>
        </HeroEnter>
      </div>
      {trailing && (
        <HeroEnter delay={100}>
          <div className="shrink-0">{trailing}</div>
        </HeroEnter>
      )}
    </div>
  );
}

/** Staggered content block */
export function MotionBlock({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <Reveal delay={delay} className={className}>
      {children}
    </Reveal>
  );
}

/** Stack of blocks with automatic stagger */
export function MotionStack({
  children,
  className,
  step = 70,
  start = 80,
}: {
  children: ReactNode[];
  className?: string;
  step?: number;
  start?: number;
}) {
  return (
    <div className={cn("space-y-4 lg:space-y-5", className)}>
      {children.map((child, i) => (
        <Reveal key={i} delay={start + i * step}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
