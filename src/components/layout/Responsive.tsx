"use client";

import { cn } from "@/lib/cn";
import {
  MotionPageHeader,
  PageShell,
} from "@/components/motion/PageChrome";

/**
 * Render dedicated mobile vs desktop UIs without JS media queries.
 * Mobile: default · Desktop: lg+ (1024px)
 */
export function MobileOnly({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("lg:hidden", className)}>{children}</div>;
}

export function DesktopOnly({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("hidden lg:block", className)}>{children}</div>;
}

/** Shared page container — narrow on mobile, wide on desktop */
export function PageFrame({
  children,
  className,
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <PageShell
      wide={wide}
      className={cn(
        wide ? "max-w-7xl" : "max-w-lg lg:max-w-5xl",
        "mx-auto",
        className
      )}
    >
      {children}
    </PageShell>
  );
}

/** Premium animated header — used app-wide */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <MotionPageHeader
      kicker={kicker}
      title={title}
      description={description}
      actions={actions}
    />
  );
}
