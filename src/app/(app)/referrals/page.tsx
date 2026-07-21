"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MobileOnly, DesktopOnly, PageHeader } from "@/components/layout/Responsive";
import { MotionMobileHeader } from "@/components/motion/PageChrome";
import { Reveal } from "@/components/motion/Reveal";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/cn";

type RefData = {
  referralCode: string;
  link: string;
  role: string;
  isAgent: boolean;
  agentSince: string | null;
  lifetimeVolume: number;
  agentThreshold: number;
  progressPct: number;
  commissionBalance: number;
  totalEarned: number;
  signupBonus: number;
  purchasePct: number;
  referrals: { id: string; phone: string; joinedAt: string; volume: number }[];
  commissions: { id: string; kind: string; amount: number; createdAt: string }[];
};

export default function ReferralsPage() {
  const [data, setData] = useState<RefData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  if (!data) {
    return (
      <div className="px-4 py-12 text-center text-sm text-ink/50 lg:px-8">
        Loading referral desk…
      </div>
    );
  }

  const body = (
    <div className="space-y-6">
      <div className="surface-deep p-5 lg:p-8">
        <p className="font-mono-num text-[10px] tracking-widest text-amber">YOUR CODE</p>
        <p className="font-mono-num mt-2 text-3xl lg:text-5xl">{data.referralCode}</p>
        <p className="mt-3 break-all text-sm text-paper/70">{data.link}</p>
        <Button className="mt-4" variant="amber" onClick={copyLink}>
          {copied ? "Copied ✓" : "Copy link"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface p-4">
          <p className="font-mono-num text-[10px] text-ink/45">COMMISSION WALLET</p>
          <p className="font-mono-num mt-1 text-2xl font-semibold text-green">
            {formatNaira(data.commissionBalance)}
          </p>
        </div>
        <div className="surface p-4">
          <p className="font-mono-num text-[10px] text-ink/45">TOTAL EARNED</p>
          <p className="font-mono-num mt-1 text-2xl font-semibold">
            {formatNaira(data.totalEarned)}
          </p>
        </div>
        <div className="surface p-4">
          <p className="font-mono-num text-[10px] text-ink/45">REFERRALS</p>
          <p className="font-mono-num mt-1 text-2xl font-semibold">
            {data.referrals.length}
          </p>
        </div>
      </div>

      <div className="surface p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono-num text-[10px] tracking-widest text-ink/45">
            AGENT TIER
          </p>
          <span
            className={cn(
              "font-mono-num rounded-full px-2 py-0.5 text-[10px]",
              data.isAgent ? "bg-green text-white" : "bg-ink/10 text-ink/60"
            )}
          >
            {data.isAgent ? "AGENT" : data.role}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink/65">
          Wholesale rates + API keys unlock at{" "}
          <span className="font-mono-num">{formatNaira(data.agentThreshold, { compact: true })}</span>{" "}
          lifetime volume.
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full bg-green transition-all"
            style={{ width: `${data.progressPct}%` }}
          />
        </div>
        <p className="font-mono-num mt-2 text-xs text-ink/50">
          {formatNaira(data.lifetimeVolume, { compact: true })} /{" "}
          {formatNaira(data.agentThreshold, { compact: true })} ({data.progressPct.toFixed(0)}%)
        </p>
        {data.isAgent && (
          <Link href="/agent" className="mt-3 inline-block text-sm font-semibold text-green">
            Open agent desk →
          </Link>
        )}
      </div>

      <div className="surface p-5 text-sm text-ink/70">
        <p className="font-mono-num text-[10px] tracking-widest text-ink/45">RULES</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            ₦{data.signupBonus} when a referred user funds their wallet (once)
          </li>
          <li>
            {data.purchasePct}% of their purchases for 12 months
          </li>
          <li>Commissions credit the commission wallet (not main)</li>
        </ul>
      </div>

      {data.referrals.length > 0 && (
        <section>
          <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/45">
            YOUR REFERRALS
          </h2>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {data.referrals.map((r) => (
              <li key={r.id} className="flex justify-between px-3 py-3 text-sm">
                <div>
                  <p className="font-mono-num font-medium">{r.phone}</p>
                  <p className="font-mono-num text-[10px] text-ink/40">
                    {new Date(r.joinedAt).toLocaleDateString("en-NG")}
                  </p>
                </div>
                <p className="font-mono-num text-green">
                  {formatNaira(r.volume, { compact: true })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.commissions.length > 0 && (
        <section>
          <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/45">
            COMMISSION LEDGER
          </h2>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {data.commissions.map((c) => (
              <li key={c.id} className="flex justify-between px-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{c.kind.replace(/_/g, " ")}</p>
                  <p className="font-mono-num text-[10px] text-ink/40">
                    {new Date(c.createdAt).toLocaleString("en-NG")}
                  </p>
                </div>
                <p className="font-mono-num font-semibold text-green">
                  +{formatNaira(c.amount, { compact: true })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  return (
    <>
      <MobileOnly>
        <div className="space-y-5 px-4 py-6">
          <MotionMobileHeader kicker="GROWTH" title="REFERRALS." />
          <Reveal delay={100}>{body}</Reveal>
        </div>
      </MobileOnly>
      <DesktopOnly>
        <div className="px-8 py-8 xl:px-10">
          <PageHeader
            kicker="GROWTH DESK"
            title="REFERRALS."
            description="Earn on signups and purchases. Unlock agent wholesale + API at volume threshold."
          />
          <Reveal delay={140}>
            <div className="max-w-3xl">{body}</div>
          </Reveal>
        </div>
      </DesktopOnly>
    </>
  );
}
