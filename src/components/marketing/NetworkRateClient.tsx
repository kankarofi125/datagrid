"use client";

import Link from "next/link";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";
import { RateBoard } from "@/components/landing/RateBoard";

const CODE_ALIASES: Record<string, string> = {
  "9MOBILE": "NINEMOBILE",
  ETISALAT: "NINEMOBILE",
};

export function NetworkRateClient({ network }: { network: string }) {
  const code =
    CODE_ALIASES[network.toUpperCase()] || network.toUpperCase();
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
          Live {network} plans by type — tap any plan to check out with your
          wallet.
        </p>
      </HeroEnter>
      <Reveal delay={200}>
        <div className="mt-8">
          <RateBoard lockedNetwork={code} />
        </div>
      </Reveal>
    </div>
  );
}
