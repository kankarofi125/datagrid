"use client";

import Link from "next/link";
import { formatNaira } from "@/lib/money";
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

function shortWhen(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryViews({ rows }: { rows: HistoryRow[] }) {
  return (
    <>
      <MobileOnly>
        <div className="space-y-3 px-3 py-3 pb-5">
          <div>
            <p className="font-mono-num text-[9px] tracking-[0.16em] text-ink/40">LEDGER</p>
            <h1 className="font-display text-xl leading-none text-ink">HISTORY.</h1>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[11px] text-ink/50">
              No transactions yet.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-line bg-paper">
              {rows.map((t, i) => (
                <li key={t.id}>
                  <Link
                    href={`/history/${t.orderRef}`}
                    className={
                      i > 0
                        ? "flex items-center justify-between gap-2 border-t border-line px-2.5 py-2"
                        : "flex items-center justify-between gap-2 px-2.5 py-2"
                    }
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold leading-tight text-ink">
                        {t.service}
                        {t.phone ? (
                          <span className="font-mono-num font-normal text-ink/35">
                            {" "}
                            · {t.phone}
                          </span>
                        ) : null}
                      </p>
                      <p className="font-mono-num mt-0.5 truncate text-[9px] leading-none text-ink/40">
                        {t.orderRef} · {t.status} · {shortWhen(t.createdAt)}
                      </p>
                    </div>
                    <p className="font-mono-num shrink-0 text-[12px] font-semibold tabular-nums text-green">
                      {formatNaira(t.amount, { compact: true })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </MobileOnly>

      <DesktopOnly>
        <div className="px-8 py-6 xl:px-10">
          <div className="mb-4">
            <p className="font-mono-num text-[10px] tracking-[0.16em] text-ink/40">LEDGER</p>
            <h1 className="font-display text-3xl leading-none text-ink">HISTORY.</h1>
          </div>
          {rows.length === 0 ? (
            <Reveal delay={80}>
              <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink/55">
                No transactions yet.
              </p>
            </Reveal>
          ) : (
            <Reveal delay={80}>
              <div className="overflow-hidden rounded-xl border border-line bg-paper">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-line bg-ink/[0.02]">
                      {["ORDER", "SERVICE", "NUMBER", "STATUS", "AMOUNT", "WHEN"].map(
                        (h) => (
                          <th
                            key={h}
                            className="font-mono-num px-3 py-2 text-[9px] tracking-[0.12em] text-ink/45"
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
                        <td className="px-3 py-2">
                          <Link
                            href={`/history/${t.orderRef}`}
                            className="font-mono-num text-[11px] text-green hover:underline"
                          >
                            {t.orderRef}
                          </Link>
                        </td>
                        <td className="px-3 py-2 font-medium">{t.service}</td>
                        <td className="font-mono-num px-3 py-2 text-[11px] text-ink/60">
                          {t.phone || "—"}
                        </td>
                        <td className="font-mono-num px-3 py-2 text-[10px] text-ink/55">
                          {t.status}
                        </td>
                        <td className="font-mono-num px-3 py-2 text-[12px] font-semibold text-green">
                          {formatNaira(t.amount, { compact: true })}
                        </td>
                        <td className="font-mono-num px-3 py-2 text-[10px] text-ink/45">
                          {shortWhen(t.createdAt)}
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
