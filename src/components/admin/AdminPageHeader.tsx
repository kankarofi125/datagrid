"use client";

import { HeroEnter } from "@/components/motion/Reveal";
import type { ReactNode } from "react";

export function AdminPageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <HeroEnter delay={0}>
          <p className="font-mono-num text-[11px] tracking-widest text-green">{kicker}</p>
        </HeroEnter>
        <HeroEnter delay={70}>
          <h1 className="font-display mt-1 text-4xl lg:text-5xl">{title}</h1>
        </HeroEnter>
        {description && (
          <HeroEnter delay={120}>
            <p className="mt-2 max-w-xl text-sm text-ink/60">{description}</p>
          </HeroEnter>
        )}
      </div>
      {actions && (
        <HeroEnter delay={160}>
          <div className="flex gap-2">{actions}</div>
        </HeroEnter>
      )}
    </div>
  );
}
