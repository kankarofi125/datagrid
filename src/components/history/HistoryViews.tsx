"use client";

import Link from "next/link";
import { formatNaira } from "@/lib/money";
import { MotionMobileHeader, MotionPageHeader } from "@/components/motion/PageChrome";
import { Reveal } from "@/components/motion/Reveal";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";

export type HistoryRow = {
  id: string;
  orderRef: string;
  service: string;
  status: string;
  amount: number;
  phone: string | null;
  createdAt: string;
};

export function HistoryViews({ rows }: { rows: HistoryRow[] }) {
  return (
    <>
      <MobileOnly>
        <div className="space-y-5 px-4 py-6">
          <MotionMobileHeader kicker="LEDGER" title="HISTORY." />
          {rows.length === 0 ? (
            <Reveal delay={100}>
              <p className="surface border-dashed p-6 text-center text-sm text-ink/55">
                No transactions yet.
              </p>
            </Reveal>
          ) : (
            <ul className="space-y-2">
              {rows.map((t, i) => (
                <Reveal key={t.id} delay={80 + i * 35} as="li">
                  <Link
                    href={`/history/${t.orderRef}`}
                    className="edge-card surface flex items-center justify-between px-4 py-3"
                    style={{ borderLeftColor: "#008751" }}
                  >
                    <div className="min-w-0">
                      <p className="font-mono-num text-[10px] text-ink/45">{t.orderRef}</p>
                      <p className="truncate text-sm font-medium">
                        {t.service}
                        {t.phone ? ` · ${t.phone}` : ""}
                      </p>
                      <p className="font-mono-num text-[11px] text-ink/50">
                        {t.status} · {new Date(t.createdAt).toLocaleString("en-NG")}
                      </p>
                    </div>
                    <p className="font-mono-num shrink-0 font-semibold text-green">
                      {formatNaira(t.amount, { compact: true })}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </MobileOnly>

      <DesktopOnly>
        <div className="px-8 py-8 xl:px-10">
          <MotionPageHeader
            kicker="LEDGER"
            title="HISTORY."
            description="Every wallet fund, data buy, and refund with full status trail."
          />
          {rows.length === 0 ? (
            <Reveal delay={100}>
              <p className="surface border-dashed p-10 text-center text-sm text-ink/55">
                No transactions yet.
              </p>
            </Reveal>
          ) : (
            <Reveal delay={120}>
              <div className="surface overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-ink/[0.03]">
                      {["ORDER", "SERVICE", "NUMBER", "STATUS", "AMOUNT", "WHEN"].map(
                        (h) => (
                          <th
                            key={h}
                            className="font-mono-num px-4 py-3 text-[10px] tracking-[0.14em] text-ink/50"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-line transition last:border-0 hover:bg-ink/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/history/${t.orderRef}`}
                            className="font-mono-num text-green hover:underline"
                          >
                            {t.orderRef}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium">{t.service}</td>
                        <td className="font-mono-num px-4 py-3">{t.phone || "—"}</td>
                        <td className="font-mono-num px-4 py-3 text-xs">{t.status}</td>
                        <td className="font-mono-num px-4 py-3 font-semibold text-green">
                          {formatNaira(t.amount, { compact: true })}
                        </td>
                        <td className="font-mono-num px-4 py-3 text-xs text-ink/50">
                          {new Date(t.createdAt).toLocaleString("en-NG")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          )}
        </div>
      </DesktopOnly>
    </>
  );
}
