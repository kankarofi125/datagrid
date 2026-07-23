import Link from "next/link";
import { DashboardIcon } from "./DashboardIcon";
import { DASHBOARD_SERVICES } from "./DashboardMobile";
import { formatNaira } from "@/lib/money";
import type { NetworkCode } from "@/lib/phone";
import { NETWORK_COLORS } from "@/lib/phone";
import { cn } from "@/lib/cn";

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

const FALLBACK_NETWORKS: Net[] = [
  { code: "MTN", name: "MTN", status: "OPERATIONAL", uptimePct: 99.7 },
  { code: "GLO", name: "Glo", status: "OPERATIONAL", uptimePct: 99.4 },
  { code: "AIRTEL", name: "Airtel", status: "OPERATIONAL", uptimePct: 99.6 },
  { code: "NINEMOBILE", name: "9mobile", status: "OPERATIONAL", uptimePct: 99.2 },
];

function repeatHref(transaction: Tx) {
  if (transaction.service === "DATA") {
    return `/buy/data?phone=${encodeURIComponent(transaction.phone || "")}&planId=${transaction.planId || ""}`;
  }
  return `/buy/airtime?phone=${encodeURIComponent(transaction.phone || "")}&amount=${transaction.amount}`;
}

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
  const first = name.split(" ")[0] || "Operator";
  const networkRows = networks.length ? networks : FALLBACK_NETWORKS;
  const operational = networkRows.filter((network) => network.status === "OPERATIONAL").length;
  const recentSpend = lastTx.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <div className="px-7 py-7 xl:px-10 xl:py-9">
      <header className="mb-7 flex items-end justify-between gap-6">
        <div>
          <p className="font-mono-num flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-green">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-green" />
            Operator desk
          </p>
          <h1 className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.035em] text-ink xl:text-[40px]">
            Welcome back, {first}.
          </h1>
          <p className="mt-2 text-sm text-ink/50">
            Your wallet, services and delivery network—at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/history"
            className="flex h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink/65 shadow-sm"
          >
            View transactions
          </Link>
          <Link
            href="/wallet"
            className="flex h-11 items-center gap-2 rounded-xl bg-amber px-4 text-sm font-bold text-[#2c1b02] shadow-[0_10px_24px_-16px_rgba(242,166,61,.9)]"
          >
            <span className="text-lg font-normal" aria-hidden>+</span>
            Fund wallet
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-5">
        <section className="wallet-card col-span-5 min-h-[278px] overflow-hidden rounded-[22px] text-paper">
          <div className="bg-grid bg-grid-live flex h-full flex-col p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-num text-[10px] font-semibold tracking-[0.16em] text-amber">
                  MAIN WALLET
                </p>
                <p className="font-mono-num mt-3 text-[38px] font-semibold leading-none tracking-[-0.04em] tabular-nums xl:text-[42px]">
                  {formatNaira(balance)}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 font-mono-num text-[9px] tracking-wider text-paper/60">
                AVAILABLE
              </span>
            </div>

            <div className="mt-auto grid grid-cols-3 border-y border-white/10 py-4">
              <div>
                <p className="font-mono-num text-[8px] uppercase tracking-wider text-paper/40">
                  Recent spend
                </p>
                <p className="font-mono-num mt-1.5 text-sm font-semibold tabular-nums">
                  {formatNaira(recentSpend, { compact: true })}
                </p>
              </div>
              <div className="border-x border-white/10 px-4">
                <p className="font-mono-num text-[8px] uppercase tracking-wider text-paper/40">
                  Orders
                </p>
                <p className="font-mono-num mt-1.5 text-sm font-semibold tabular-nums">
                  {lastTx.length}
                </p>
              </div>
              <div className="pl-4">
                <p className="font-mono-num text-[8px] uppercase tracking-wider text-paper/40">
                  Networks
                </p>
                <p className="font-mono-num mt-1.5 text-sm font-semibold tabular-nums">
                  {operational}/{networkRows.length}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="/wallet"
                className="flex h-10 flex-1 items-center justify-center rounded-xl bg-amber text-sm font-bold text-[#2c1b02]"
              >
                Fund wallet
              </Link>
              <Link
                href="/wallet"
                className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-sm font-semibold text-paper"
              >
                Send money
              </Link>
            </div>
          </div>
        </section>

        <section className="col-span-7 rounded-[22px] border border-line bg-white p-5 shadow-[0_18px_44px_-36px_rgba(14,33,26,.6)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                Start a transaction
              </p>
              <p className="mt-1 text-sm text-ink/48">Choose a service to continue.</p>
            </div>
            <Link href="/buy" className="text-xs font-semibold text-green">
              All services →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {DASHBOARD_SERVICES.map((service, index) => (
              <Link
                key={service.href}
                href={service.href}
                className={cn(
                  "group flex min-h-[91px] items-center gap-3 rounded-2xl border p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                  index === 0
                    ? "border-green-deep bg-green-deep text-paper"
                    : "border-line bg-[#faf9f5] text-ink"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    service.iconClass
                  )}
                >
                  <DashboardIcon name={service.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{service.label}</span>
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-[11px]",
                      index === 0 ? "text-paper/50" : "text-ink/40"
                    )}
                  >
                    {service.blurb}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="col-span-8 rounded-[22px] border border-line bg-white p-5 shadow-[0_18px_44px_-38px_rgba(14,33,26,.7)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                Buy again
              </p>
              <p className="mt-1 text-sm text-ink/48">Repeat a successful purchase in one click.</p>
            </div>
            <Link href="/history" className="text-xs font-semibold text-green">
              Full history →
            </Link>
          </div>
          {lastTx.length === 0 ? (
            <div className="flex min-h-[128px] flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/55 text-center">
              <p className="text-sm font-medium text-ink/60">No delivered orders yet.</p>
              <Link href="/buy/data" className="mt-2 text-xs font-bold text-green">
                Buy your first data plan →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
              {lastTx.map((transaction) => (
                <Link
                  key={transaction.id}
                  href={repeatHref(transaction)}
                  className="group rounded-2xl border border-line bg-[#faf9f5] p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-green/25 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono-num text-[9px] font-semibold tracking-wider text-green">
                      {transaction.service}
                    </span>
                    <span className="text-ink/25 transition group-hover:text-green" aria-hidden>↗</span>
                  </div>
                  <p className="font-mono-num mt-2 text-base font-semibold tabular-nums">
                    {formatNaira(transaction.amount, { compact: true })}
                  </p>
                  <p className="mt-1 truncate text-xs text-ink/42">
                    {transaction.phone || "Delivered order"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="col-span-4 rounded-[22px] border border-line bg-white p-5 shadow-[0_18px_44px_-38px_rgba(14,33,26,.7)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                Network health
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {operational}/{networkRows.length} operational
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-green/8 px-2.5 py-1 font-mono-num text-[9px] font-bold text-green">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-green" />
              LIVE
            </span>
          </div>
          <ul>
            {networkRows.map((network) => (
              <li
                key={network.code}
                className="flex min-h-[44px] items-center justify-between border-t border-line first:border-t-0"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        network.status === "OPERATIONAL"
                          ? NETWORK_COLORS[network.code]
                          : "#e5484d",
                    }}
                  />
                  {network.name}
                </span>
                <span className="font-mono-num text-[11px] tabular-nums text-ink/45">
                  {Number(network.uptimePct).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <nav className="mt-5 grid grid-cols-4 gap-3" aria-label="Account shortcuts">
        {[
          { href: "/wallet", label: "Wallet & ledger", icon: "wallet" as const },
          { href: "/schedules", label: "Schedules", icon: "calendar" as const },
          { href: "/referrals", label: "Referrals", icon: "referrals" as const },
          { href: "/agent", label: "Agent & API", icon: "data" as const },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-[66px] items-center gap-3 rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-ink/70 shadow-[0_14px_36px_-34px_rgba(14,33,26,.8)] transition hover:-translate-y-0.5 hover:text-ink hover:shadow-lg"
          >
            <DashboardIcon name={item.icon} className="h-[18px] w-[18px] text-green" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
