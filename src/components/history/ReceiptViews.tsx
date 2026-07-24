"use client";

import Link from "next/link";
import { ReceiptCard } from "@/components/buy/ReceiptCard";
import { DisputeForm } from "@/components/support/DisputeForm";
import { MotionPageHeader } from "@/components/motion/PageChrome";
import { Reveal, HeroEnter } from "@/components/motion/Reveal";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";

export type ReceiptTx = {
  orderRef: string;
  service: string;
  status: string;
  amount: number;
  phone: string | null;
  networkCode: string | null;
  meterNumber: string | null;
  smartCardNumber: string | null;
  customerName: string | null;
  token: string | null;
  planName?: string | null;
  trail: { at: string; status: string; note?: string }[];
};

export function ReceiptViews({ tx }: { tx: ReceiptTx }) {
  const body = (
    <>
      <div className="rounded-[22px] border border-line bg-paper p-3 shadow-[0_16px_44px_rgba(7,31,23,.08)] sm:p-4">
        <ReceiptCard
          orderRef={tx.orderRef}
          service={tx.service}
          status={tx.status}
          amount={tx.amount}
          phone={tx.phone}
          networkCode={tx.networkCode}
          customerName={tx.customerName}
          token={tx.token}
          tokenLabel={tx.service === "EXAM_PIN" ? "Exam pin" : "Token"}
          planName={
            tx.planName ||
            (tx.meterNumber
              ? `Meter ${tx.meterNumber}`
              : tx.smartCardNumber
                ? `IUC ${tx.smartCardNumber}`
                : undefined)
          }
        />
      </div>

      <div className="mt-6">
        <h2 className="font-mono-num text-[11px] tracking-widest text-ink/45">
          STATUS TRAIL
        </h2>
        <ol className="mt-3 space-y-2" aria-live="polite">
          {tx.trail.map((s, i) => (
            <li key={i} className="flex gap-3 border-l-2 border-green pl-3 text-sm">
              <div>
                <p className="font-semibold">{s.status}</p>
                <p className="font-mono-num text-[11px] text-ink/50">{s.at}</p>
                {s.note && <p className="text-ink/60">{s.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );

  return (
    <>
      <MobileOnly>
        <div className="space-y-5 px-4 py-6">
          <HeroEnter delay={0}>
            <Link href="/history" className="link-draw text-sm text-green">
              ← History
            </Link>
          </HeroEnter>
          <Reveal delay={80}>{body}</Reveal>
          <Reveal delay={160}>
            <DisputeForm orderRef={tx.orderRef} />
          </Reveal>
        </div>
      </MobileOnly>
      <DesktopOnly>
        <div className="px-8 py-8 xl:px-10">
          <MotionPageHeader
            kicker="RECEIPT"
            title={tx.orderRef}
            description="Full audit trail for this order."
            actions={
              <Link href="/history" className="link-draw text-sm font-medium text-green">
                ← Back to history
              </Link>
            }
          />
          <div className="grid max-w-4xl gap-8 lg:grid-cols-5">
            <Reveal delay={120} className="lg:col-span-3">
              {body}
            </Reveal>
            <Reveal delay={200} className="space-y-4 lg:col-span-2">
              <div className="surface-deep p-5">
                <p className="font-mono-num text-[10px] tracking-widest text-amber">
                  SUPPORT
                </p>
                <p className="mt-2 text-sm text-paper/70">
                  Quote this order ref on WhatsApp for faster resolution.
                </p>
                <p className="font-mono-num mt-4 text-lg text-paper">{tx.orderRef}</p>
              </div>
              <DisputeForm orderRef={tx.orderRef} />
            </Reveal>
          </div>
        </div>
      </DesktopOnly>
    </>
  );
}
