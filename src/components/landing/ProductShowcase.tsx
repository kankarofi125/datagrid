"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const STEPS = [
  { n: "01", t: "Detect line", d: "0803… maps to MTN instantly" },
  { n: "02", t: "Pick a plan", d: "SME, gifting, or retail" },
  { n: "03", t: "Confirm PIN", d: "Balance shown before debit" },
  { n: "04", t: "Delivered", d: "Receipt + status trail" },
];

/**
 * Premium hero product card — replaces flat “sign in to buy” box.
 * No stock photography; abstract device + journey chips.
 */
export function ProductShowcase({ className }: { className?: string }) {
  const reduced = useReducedMotion() === true;

  return (
    <div className={cn("relative", className)}>
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-[40px] bg-[radial-gradient(circle_at_60%_20%,rgba(242,166,61,.22),transparent_45%),radial-gradient(circle_at_30%_80%,rgba(22,134,83,.18),transparent_50%)] blur-2xl"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_40px_90px_-40px_rgba(10,46,34,.55)]">
        {/* Top strip */}
        <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-green-deep to-[#0f3d2c] px-5 py-3.5 text-paper">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber" />
            <span className="font-mono-num text-[10px] tracking-[0.16em] text-paper/70">
              LIVE CHECKOUT
            </span>
          </div>
          <span className="font-mono-num text-[10px] text-amber">NG · WAT</span>
        </div>

        <div className="p-5 sm:p-6">
          <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.16em] text-green">
            Wallet-first VTU
          </p>
          <h2 className="font-display mt-2 text-[1.75rem] leading-[0.95] text-ink sm:text-[2rem]">
            Buy in seconds.
            <br />
            <span className="text-green">Track every order.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/58">
            Create an account, fund once, then move data, airtime, power and TV
            without the chaos of random VTU agents.
          </p>

          <ol className="mt-5 space-y-2">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.n}
                data-motion-owned
                initial={reduced ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: reduced ? 0 : 0.12 + i * 0.07,
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-center gap-3 rounded-2xl border border-line/80 bg-paper/60 px-3 py-2.5"
              >
                <span className="font-mono-num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green/10 text-[11px] font-semibold text-green">
                  {step.n}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink">
                    {step.t}
                  </span>
                  <span className="block text-[11px] text-ink/48">{step.d}</span>
                </span>
              </motion.li>
            ))}
          </ol>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <Link href="/signup" className="w-full sm:flex-1">
              <Button size="lg" className="w-full">
                Create account
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:flex-1">
              <Button size="lg" variant="ghost" className="w-full">
                Sign in
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-center font-mono-num text-[9px] tracking-wide text-ink/35">
            PIN · OTP · OPTIONAL EMAIL 2FA · GOOGLE LINK
          </p>
        </div>
      </div>
    </div>
  );
}
