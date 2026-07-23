import Link from "next/link";
import { DashboardIcon, type DashboardIconName } from "./DashboardIcon";
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

export const DASHBOARD_SERVICES: {
  href: string;
  label: string;
  mono: string;
  blurb: string;
  accent: string;
  icon: DashboardIconName;
  iconClass: string;
}[] = [
  {
    href: "/buy/data",
    label: "Data",
    mono: "DATA",
    blurb: "SME · Gifting",
    accent: "#0f3b2a",
    icon: "data",
    iconClass: "bg-white/10 text-amber",
  },
  {
    href: "/buy/airtime",
    label: "Airtime",
    mono: "AIR",
    blurb: "All networks",
    accent: "#9a6316",
    icon: "airtime",
    iconClass: "bg-[#fcebd1] text-[#9a6316]",
  },
  {
    href: "/buy/electricity",
    label: "Power",
    mono: "KWH",
    blurb: "Instant tokens",
    accent: "#2f6fae",
    icon: "power",
    iconClass: "bg-[#e4eef7] text-[#2f6fae]",
  },
  {
    href: "/buy/cable",
    label: "Cable TV",
    mono: "TV",
    blurb: "DStv · GOtv",
    accent: "#6e4fb0",
    icon: "cable",
    iconClass: "bg-[#efe9fa] text-[#6e4fb0]",
  },
  {
    href: "/buy/betting",
    label: "Betting",
    mono: "BET",
    blurb: "Wallet top-up",
    accent: "#b23b31",
    icon: "wallet",
    iconClass: "bg-[#fbe7e5] text-[#b23b31]",
  },
  {
    href: "/buy/pins",
    label: "Exam pins",
    mono: "PIN",
    blurb: "WAEC · NECO",
    accent: "#1e8a76",
    icon: "exam",
    iconClass: "bg-[#e1f3ef] text-[#1e8a76]",
  },
];

const QUICK_ACTIONS: {
  href: string;
  label: string;
  icon: DashboardIconName;
}[] = [
  { href: "/buy/data", label: "Data", icon: "data" },
  { href: "/buy/airtime", label: "Airtime", icon: "airtime" },
  { href: "/buy/electricity", label: "Power", icon: "power" },
  { href: "/history", label: "History", icon: "history" },
];

const ACCOUNT_LINKS: {
  href: string;
  label: string;
  description: string;
  icon: DashboardIconName;
}[] = [
  {
    href: "/wallet",
    label: "Wallet & funding",
    description: "Fund, send and view your ledger",
    icon: "wallet",
  },
  {
    href: "/history",
    label: "Transactions",
    description: "Receipts and delivery status",
    icon: "history",
  },
  {
    href: "/schedules",
    label: "Scheduled top-ups",
    description: "Automate recurring purchases",
    icon: "calendar",
  },
  {
    href: "/referrals",
    label: "Referrals",
    description: "Invite friends and earn",
    icon: "referrals",
  },
];

const FALLBACK_NETWORKS: Net[] = [
  { code: "MTN", name: "MTN", status: "OPERATIONAL", uptimePct: 99.7 },
  { code: "GLO", name: "Glo", status: "OPERATIONAL", uptimePct: 99.4 },
  { code: "AIRTEL", name: "Airtel", status: "OPERATIONAL", uptimePct: 99.6 },
  {
    code: "NINEMOBILE",
    name: "9mobile",
    status: "OPERATIONAL",
    uptimePct: 99.2,
  },
];

function repeatHref(tx: Tx) {
  if (tx.service === "DATA") {
    return `/buy/data?phone=${encodeURIComponent(tx.phone || "")}&planId=${tx.planId || ""}`;
  }
  return `/buy/airtime?phone=${encodeURIComponent(tx.phone || "")}&amount=${tx.amount}`;
}

function SectionHeading({
  children,
  href,
  linkLabel = "View all",
}: {
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/45">
        {children}
      </h2>
      {href && (
        <Link
          href={href}
          className="flex min-h-8 items-center text-xs font-semibold text-green"
        >
          {linkLabel} <span aria-hidden className="ml-1">→</span>
        </Link>
      )}
    </div>
  );
}

export function DashboardMobile({
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
  const operational = networkRows.filter((n) => n.status === "OPERATIONAL").length;
  const recentSpend = lastTx.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <div className="px-4 pb-8 pt-5 sm:px-5">
      <header className="mb-4">
        <p className="font-mono-num text-[10px] uppercase tracking-[0.16em] text-ink/40">
          Welcome back
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
          {first}, what are we buying?
        </h1>
      </header>

      <section className="wallet-card mb-5 overflow-hidden rounded-[22px] text-paper">
        <div className="bg-grid bg-grid-live p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono-num text-[10px] font-semibold tracking-[0.16em] text-amber/90">
                MAIN WALLET
              </p>
              <p className="font-mono-num mt-2 text-[32px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                {formatNaira(balance)}
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 font-mono-num text-[9px] tracking-wider text-paper/65">
              NGN
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 border-y border-white/10 py-3.5">
            <div className="pr-2">
              <p className="font-mono-num text-[8px] uppercase tracking-wider text-paper/45">
                Recent spend
              </p>
              <p className="font-mono-num mt-1 truncate text-[13px] font-semibold tabular-nums">
                {formatNaira(recentSpend, { compact: true })}
              </p>
            </div>
            <div className="border-x border-white/10 px-3">
              <p className="font-mono-num text-[8px] uppercase tracking-wider text-paper/45">
                Orders
              </p>
              <p className="font-mono-num mt-1 text-[13px] font-semibold tabular-nums">
                {lastTx.length}
              </p>
            </div>
            <div className="pl-3">
              <p className="font-mono-num text-[8px] uppercase tracking-wider text-paper/45">
                Networks
              </p>
              <p className="font-mono-num mt-1 text-[13px] font-semibold tabular-nums">
                {operational}/{networkRows.length}
              </p>
            </div>
          </div>

          <Link
            href="/wallet"
            className="pressable mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-amber px-4 text-[15px] font-bold text-[#2c1b02] shadow-[0_10px_24px_-14px_rgba(242,166,61,.9)]"
          >
            <span className="text-xl font-normal leading-none" aria-hidden>+</span>
            Fund wallet
          </Link>
        </div>
      </section>

      <nav className="mb-6 grid grid-cols-4 gap-2" aria-label="Quick actions">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="pressable flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-white px-1 text-center shadow-[0_8px_24px_-22px_rgba(14,33,26,.65)]"
          >
            <DashboardIcon name={action.icon} className="h-[19px] w-[19px] text-green-deep" />
            <span className="text-xs font-semibold text-ink">{action.label}</span>
          </Link>
        ))}
      </nav>

      <section className="mb-6">
        <SectionHeading href="/history">Buy again</SectionHeading>
        {lastTx.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 bg-white/45 px-5 py-5 text-center">
            <p className="text-sm font-medium text-ink/65">Your quick reorders will appear here.</p>
            <Link
              href="/buy/data"
              className="mt-2 inline-flex min-h-8 items-center text-xs font-bold text-green"
            >
              Make your first purchase <span className="ml-1" aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {lastTx.map((transaction) => (
              <Link
                key={transaction.id}
                href={repeatHref(transaction)}
                className="pressable min-w-[156px] snap-start rounded-2xl border border-line bg-white p-3.5 shadow-[0_10px_28px_-24px_rgba(14,33,26,.75)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-num text-[9px] font-semibold tracking-wider text-green">
                    {transaction.service}
                  </span>
                  <span className="text-ink/30" aria-hidden>↗</span>
                </div>
                <p className="font-mono-num mt-2 text-base font-semibold tabular-nums text-ink">
                  {formatNaira(transaction.amount, { compact: true })}
                </p>
                <p className="mt-1 truncate text-xs text-ink/45">
                  {transaction.phone || "Delivered order"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6">
        <SectionHeading>Services</SectionHeading>
        <div className="grid grid-cols-2 gap-2.5">
          {DASHBOARD_SERVICES.map((service, index) => (
            <Link
              key={service.href}
              href={service.href}
              className={cn(
                "pressable relative min-h-[148px] overflow-hidden rounded-[18px] border p-4 shadow-[0_12px_30px_-26px_rgba(14,33,26,.8)]",
                index === 0
                  ? "border-green-deep bg-green-deep text-paper"
                  : "border-line bg-white text-ink"
              )}
            >
              {index === 0 && (
                <span className="absolute right-3 top-3 rounded-md bg-amber px-2 py-1 font-mono-num text-[8px] font-bold uppercase tracking-wide text-[#2c1b02]">
                  Most used
                </span>
              )}
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-[11px]",
                  service.iconClass
                )}
              >
                <DashboardIcon name={service.icon} className="h-[18px] w-[18px]" />
              </span>
              <div className="mt-6">
                <p
                  className={cn(
                    "font-mono-num text-[9px] font-semibold tracking-[0.14em]",
                    index === 0 ? "text-paper/45" : "text-ink/35"
                  )}
                >
                  {service.mono}
                </p>
                <p className="mt-1 text-[15px] font-bold">{service.label}</p>
                <p className={cn("mt-0.5 text-xs", index === 0 ? "text-paper/55" : "text-ink/48")}>
                  {service.blurb}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-[18px] border border-line bg-white p-4 shadow-[0_12px_32px_-28px_rgba(14,33,26,.8)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/45">
            Network status
          </h2>
          <span className="flex items-center gap-2 font-mono-num text-[9px] font-bold tracking-wider text-green">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-green" />
            LIVE
          </span>
        </div>
        <ul>
          {networkRows.map((network) => (
            <li
              key={network.code}
              className="flex min-h-10 items-center justify-between border-t border-line first:border-t-0"
            >
              <span className="flex items-center gap-2.5 text-[13px] font-semibold">
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
      </section>

      <section className="mb-4">
        <SectionHeading>Account</SectionHeading>
        <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-[0_12px_32px_-28px_rgba(14,33,26,.8)]">
          {ACCOUNT_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[66px] items-center gap-3.5 border-t border-line px-4 first:border-t-0"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper text-green-deep">
                <DashboardIcon name={item.icon} className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink">{item.label}</span>
                <span className="mt-0.5 block truncate text-[11px] text-ink/40">
                  {item.description}
                </span>
              </span>
              <span className="font-mono-num text-sm text-ink/25" aria-hidden>→</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/agent"
          className="flex min-h-11 items-center justify-center rounded-xl border border-line bg-white text-xs font-semibold text-ink/65"
        >
          Agent & API
        </Link>
        <Link
          href="/settings"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white text-xs font-semibold text-ink/65"
        >
          <DashboardIcon name="settings" className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
