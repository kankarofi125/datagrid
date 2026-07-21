"use client";

import Link from "next/link";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";
import type { ReactNode } from "react";

export function RatesClient({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8 lg:py-16">
      <HeroEnter delay={0}>
        <Link href="/" className="font-display text-xl link-draw">
          DATAGRID
        </Link>
      </HeroEnter>
      <HeroEnter delay={80}>
        <h1 className="font-display mt-6 text-5xl lg:text-6xl">RATES.</h1>
      </HeroEnter>
      <HeroEnter delay={140}>
        <p className="mt-3 max-w-xl text-ink/65">
          Indexable rate pages per network ship as SEO content. All prices admin-editable.
        </p>
      </HeroEnter>
      <Reveal delay={180}>
        <div className="mt-10">{children}</div>
      </Reveal>
      <Reveal delay={240}>
        <div className="mt-8 flex flex-wrap gap-3">
          {["mtn", "glo", "airtel", "9mobile"].map((n) => (
            <Link
              key={n}
              href={`/rates/${n}`}
              className="surface surface-interactive font-mono-num px-3 py-2 text-xs uppercase tracking-wide"
            >
              {n} data Nigeria
            </Link>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
