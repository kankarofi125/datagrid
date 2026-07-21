"use client";

import Link from "next/link";
import { formatNaira } from "@/lib/money";
import { DisputeForm } from "@/components/support/DisputeForm";
import { MotionMobileHeader, MotionPageHeader } from "@/components/motion/PageChrome";
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
  trail: { at: string; status: string; note?: string }[];
};

export function ReceiptViews({ tx }: { tx: ReceiptTx }) {
  const body = (
    <>
      <div className="surface relative overflow-hidden p-5 lg:p-8">
        {tx.status === "DELIVERED" && (
          <div className="stamp-delivered absolute right-4 top-4 border-4 border-green px-2 font-display text-2xl text-green">
            DELIVERED
          </div>
        )}
        <p className="font-mono-num text-[11px] tracking-widest text-ink/45">RECEIPT</p>
        <p className="font-mono-num mt-2 text-xl lg:text-2xl">{tx.orderRef}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`/api/receipts/${tx.orderRef}?format=html`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono-num rounded border border-line px-3 py-1.5 text-[11px] text-green transition hover:border-green"
          >
            PRINT / PDF
          </a>
          <a
            href={`/api/receipts/${tx.orderRef}?format=txt`}
            download={`${tx.orderRef}.txt`}
            className="font-mono-num rounded border border-line px-3 py-1.5 text-[11px] transition hover:border-green"
          >
            DOWNLOAD TXT
          </a>
        </div>
        <p className="font-mono-num mt-4 text-3xl text-green tabular-nums lg:text-4xl">
          {formatNaira(tx.amount)}
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["Service", tx.service],
            ["Phone", tx.phone || "—"],
            ["Network", tx.networkCode || "—"],
            ["Status", tx.status],
          ].map(([k, v]) => (
            <div key={k} className="border-b border-line py-2 sm:border-0">
              <dt className="text-ink/50">{k}</dt>
              <dd className="mt-0.5 font-medium font-mono-num">{v}</dd>
            </div>
          ))}
          {tx.token && (
            <div className="border-b border-line py-2 sm:col-span-2 sm:border-0">
              <dt className="text-ink/50">
                {tx.service === "EXAM_PIN" ? "Exam pin" : "Token"}
              </dt>
              <dd className="font-mono-num mt-1 break-all text-2xl tracking-wider lg:text-3xl">
                {tx.token}
              </dd>
            </div>
          )}
          {tx.customerName && (
            <div className="border-b border-line py-2 sm:border-0">
              <dt className="text-ink/50">Customer</dt>
              <dd className="mt-0.5 font-medium">{tx.customerName}</dd>
            </div>
          )}
          {tx.meterNumber && (
            <div className="border-b border-line py-2 sm:border-0">
              <dt className="text-ink/50">Meter</dt>
              <dd className="font-mono-num mt-0.5">{tx.meterNumber}</dd>
            </div>
          )}
          {tx.smartCardNumber && (
            <div className="border-b border-line py-2 sm:border-0">
              <dt className="text-ink/50">IUC</dt>
              <dd className="font-mono-num mt-0.5">{tx.smartCardNumber}</dd>
            </div>
          )}
        </dl>
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
