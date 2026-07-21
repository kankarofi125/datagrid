"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";

export function SupportClient({ phone }: { phone: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 lg:py-16">
      <HeroEnter delay={0}>
        <Link href="/" className="font-display text-xl link-draw">
          DATAGRID
        </Link>
      </HeroEnter>
      <HeroEnter delay={80}>
        <h1 className="font-display mt-6 text-4xl lg:text-5xl">SUPPORT.</h1>
      </HeroEnter>
      <HeroEnter delay={140}>
        <p className="mt-3 text-ink/65">
          WhatsApp is the primary channel. Order refs auto-attach from the floating button.
        </p>
      </HeroEnter>
      <Reveal delay={200}>
        <div className="surface mt-8 p-6">
          <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer">
            <Button fullWidth size="lg">
              Open WhatsApp
            </Button>
          </a>
        </div>
      </Reveal>
    </div>
  );
}
