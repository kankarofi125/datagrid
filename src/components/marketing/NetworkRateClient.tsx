"use client";

import Link from "next/link";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";

export function NetworkRateClient({ network }: { network: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-16">
      <HeroEnter delay={0}>
        <Link href="/rates" className="link-draw text-sm text-green">
          ← All rates
        </Link>
      </HeroEnter>
      <HeroEnter delay={80}>
        <h1 className="font-display mt-4 text-5xl lg:text-6xl">
          BUY {network} DATA NIGERIA.
        </h1>
      </HeroEnter>
      <HeroEnter delay={140}>
        <p className="mt-3 text-ink/70">
          Cheap {network} data reseller rates with guest checkout and one-tap repeat. Live plans
          load from the DataGrid catalog.
        </p>
      </HeroEnter>
      <Reveal delay={200}>
        <div className="surface mt-10 p-6">
          <p className="font-mono-num text-[10px] tracking-widest text-ink/45">NEXT STEP</p>
          <p className="mt-2 text-sm text-ink/70">
            Open the live purchase widget on the home page or sign in to buy with wallet balance.
          </p>
          <Link
            href="/#buy"
            className="mt-4 inline-block font-mono-num text-sm font-semibold text-green"
          >
            BUY NOW →
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
