"use client";

import Link from "next/link";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";

export function AboutClient() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-16">
      <HeroEnter delay={0}>
        <Link href="/" className="font-display text-xl link-draw">
          DATAGRID
        </Link>
      </HeroEnter>
      <HeroEnter delay={80}>
        <h1 className="font-display mt-6 text-5xl lg:text-6xl">TRUST.</h1>
      </HeroEnter>
      <HeroEnter delay={140}>
        <p className="mt-4 text-lg leading-relaxed text-ink/70">
          DataGrid is infrastructure — reliable, fast, always on. Provider failover, idempotent
          money paths, NDPR-aware data handling, and a status trail on every order.
        </p>
      </HeroEnter>
      <Reveal delay={200}>
        <ul className="surface mt-10 space-y-4 p-6 text-sm text-ink/70">
          {[
            "CAC RC slot ready for registration number",
            "NDPR privacy policy published",
            "Transactions final after delivery",
            "WhatsApp support with order-ref prefills",
          ].map((item, i) => (
            <li key={item} className="flex gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
              <span className="font-mono-num text-[10px] text-green">
                {String(i + 1).padStart(2, "0")}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
