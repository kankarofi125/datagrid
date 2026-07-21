"use client";

import Link from "next/link";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";

export function LegalClient({ title, body }: { title: string; body: string }) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 lg:py-16">
      <HeroEnter delay={0}>
        <Link href="/" className="font-display text-xl link-draw">
          DATAGRID
        </Link>
      </HeroEnter>
      <HeroEnter delay={80}>
        <h1 className="font-display mt-6 text-4xl lg:text-5xl">{title}</h1>
      </HeroEnter>
      <Reveal delay={140}>
        <div className="surface mt-8 p-6">
          <p className="leading-relaxed text-ink/70">{body}</p>
        </div>
      </Reveal>
    </article>
  );
}
