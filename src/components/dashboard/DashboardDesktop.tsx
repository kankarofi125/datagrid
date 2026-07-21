import Link from "next/link";
import { formatNaira } from "@/lib/money";
import { NetworkStatusBoard } from "@/components/landing/NetworkStatusBoard";
import { DASHBOARD_SERVICES } from "@/components/dashboard/DashboardMobile";
import { Reveal } from "@/components/motion/Reveal";
import type { NetworkCode } from "@/lib/phone";

type Tx = {
  id: string;
  service: string;
  amount: number;
  phone: string | null;
  planId: string | null;
  orderRef?: string;
  status?: string;
};

type Net = {
  code: NetworkCode;
  name: string;
  status: string;
  uptimePct: number;
};

export function DashboardDesktop({
  name,
  balance,
  lastTx,
  networks,
}: {
  name: string;
  balance: number;
  lastTx: Tx[];
  networks: Net[];
}) {
  return (
    <div className="px-8 py-8 xl:px-10">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="font-mono-num mono-label-in text-[11px] tracking-[0.2em] text-green">
            OPERATOR DESK · LIVE
          </p>
          <h1 className="font-display mt-2 text-5xl text-ink xl:text-6xl">
            {name.split(" ")[0].toUpperCase()}.
          </h1>
          <p className="mt-3 max-w-lg text-base text-ink/60">
            Control room overview — fund, buy, and track every order from one grid.
          </p>
        </div>
        <Link
          href="/wallet"
          className="surface-deep surface-interactive group min-w-[220px] px-6 py-5"
        >
          <p className="font-mono-num text-[10px] tracking-widest text-amber">MAIN WALLET</p>
          <p className="font-mono-num mt-2 text-3xl font-semibold tabular-nums">
            {formatNaira(balance)}
          </p>
          <p className="mt-3 font-mono-num text-[11px] tracking-wide text-amber/80 transition group-hover:text-amber">
            FUND OR TRANSFER →
          </p>
        </Link>
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-12">
        {/* Service bento — proper 12-col, no broken spans */}
        <section className="xl:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono-num text-[11px] tracking-widest text-ink/50">
              SERVICE GRID
            </h2>
          </div>
          <div className="bento-services">
            {DASHBOARD_SERVICES.map((s, i) => {
              const deep = i === 0;
              return (
                <Reveal key={s.href} delay={i * 50} className="h-full">
                  <Link
                    href={s.href}
                    className={
                      deep
                        ? "surface-deep surface-interactive group flex h-full flex-col justify-between p-6 xl:p-7"
                        : "surface surface-interactive group flex h-full flex-col justify-between p-5"
                    }
                  >
                    <div>
                      <p
                        className="font-mono-num text-[11px] tracking-widest"
                        style={{ color: deep ? "#FFB703" : s.accent }}
                      >
                        {s.mono}
                      </p>
                      <p
                        className={`mt-3 font-semibold ${deep ? "text-3xl xl:text-4xl" : "text-xl"}`}
                      >
                        {s.label}
                      </p>
                      {deep && (
                        <p className="mt-3 max-w-sm text-sm leading-relaxed text-paper/55">
                          Primary loop · network auto-detect · PIN confirm · wallet debit
                        </p>
                      )}
                    </div>
                    <p
                      className="font-mono-num mt-5 text-[10px] tracking-wide opacity-40 transition group-hover:opacity-100"
                      style={{ color: deep ? "#FFB703" : undefined }}
                    >
                      OPEN →
                    </p>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Right rail — equal card stack, consistent surfaces */}
        <aside className="flex flex-col gap-5 xl:col-span-4">
          <Reveal delay={80}>
            <div className="surface-deep overflow-hidden p-1">
              <NetworkStatusBoard networks={networks.length ? networks : undefined} />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-mono-num text-[11px] tracking-widest text-ink/50">
                  ONE-TAP REPEAT
                </h2>
                <Link href="/history" className="link-draw text-xs font-medium text-green">
                  Full ledger
                </Link>
              </div>
              {lastTx.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-ink/50">
                  No delivered orders yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {lastTx.map((t) => {
                    const href =
                      t.service === "DATA"
                        ? `/buy/data?phone=${encodeURIComponent(t.phone || "")}&planId=${t.planId || ""}`
                        : `/buy/airtime?phone=${encodeURIComponent(t.phone || "")}&amount=${t.amount}`;
                    return (
                      <li key={t.id}>
                        <Link
                          href={href}
                          className="edge-card flex items-center justify-between rounded-lg border border-line bg-paper px-3.5 py-3"
                          style={{ borderLeftColor: "#008751" }}
                        >
                          <div className="min-w-0">
                            <p className="font-mono-num text-[10px] text-ink/45">{t.service}</p>
                            <p className="truncate text-sm font-medium">{t.phone}</p>
                          </div>
                          <p className="font-mono-num shrink-0 font-semibold text-green">
                            {formatNaira(t.amount, { compact: true })}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/wallet", mono: "WALLET", label: "Fund · Ledger", accent: "text-ink/45" },
                { href: "/referrals", mono: "AGENTS", label: "Referrals", accent: "text-amber" },
                { href: "/schedules", mono: "AUTO", label: "Schedules", accent: "text-ink/45" },
                { href: "/agent", mono: "API", label: "Reseller desk", accent: "text-green" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="surface surface-interactive p-4"
                >
                  <p className={`font-mono-num text-[10px] tracking-widest ${item.accent}`}>
                    {item.mono}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-snug">{item.label}</p>
                </Link>
              ))}
            </div>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}
