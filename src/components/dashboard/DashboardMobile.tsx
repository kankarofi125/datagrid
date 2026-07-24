import Link from "next/link";
import { DashboardIcon, type DashboardIconName } from "./DashboardIcon";
import { formatNaira } from "@/lib/money";
import type { NetworkCode } from "@/lib/phone";
import { NETWORK_COLORS } from "@/lib/phone";
import { cn } from "@/lib/cn";
import { BalanceAmount } from "@/components/ui/BalanceAmount";

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
    href: "/services?service=data",
    label: "Data",
    mono: "DATA",
    blurb: "SME · Gifting",
    accent: "#0f3b2a",
    icon: "data",
    iconClass: "bg-white/10 text-amber",
  },
  {
    href: "/services?service=airtime",
    label: "Airtime",
    mono: "AIR",
    blurb: "All networks",
    accent: "#9a6316",
    icon: "airtime",
    iconClass: "bg-[#fcebd1] text-[#9a6316]",
  },
  {
    href: "/services?service=electricity",
    label: "Power",
    mono: "KWH",
    blurb: "Instant tokens",
    accent: "#2f6fae",
    icon: "power",
    iconClass: "bg-[#e4eef7] text-[#2f6fae]",
  },
  {
    href: "/services?service=cable",
    label: "Cable TV",
    mono: "TV",
    blurb: "DStv · GOtv",
    accent: "#6e4fb0",
    icon: "cable",
    iconClass: "bg-[#efe9fa] text-[#6e4fb0]",
  },
  {
    href: "/services?service=pins",
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
  { href: "/services?service=data", label: "Data", icon: "data" },
  { href: "/services?service=airtime", label: "Airtime", icon: "airtime" },
  { href: "/services?service=electricity", label: "Power", icon: "power" },
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
    return `/services?service=data&phone=${encodeURIComponent(tx.phone || "")}&planId=${tx.planId || ""}`;
  }
  return `/services?service=airtime&phone=${encodeURIComponent(tx.phone || "")}&amount=${tx.amount}`;
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
  balance,
  lastTx,
  networks,
}: {
  name: string;
  balance: number;
  lastTx: Tx[];
  networks: Net[];
}) {
  const networkRows = networks.length ? networks : FALLBACK_NETWORKS;
  const operational = networkRows.filter((n) => n.status === "OPERATIONAL").length;
  const recentSpend = lastTx.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <div className="px-3.5 pb-6 pt-3.5 sm:px-5 sm:pt-5">
      <section className="wallet-card mb-4 overflow-hidden rounded-[18px] text-paper">
        <div className="p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono-num text-[9px] font-semibold tracking-[0.15em] text-amber/90">
                MAIN WALLET
              </p>
              <BalanceAmount amount={balance} variant="card" className="mt-1.5 text-paper" />
            </div>
            <Link
              href="/wallet"
              className="pressable flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-amber px-3.5 text-[13px] font-bold text-[#2c1b02] shadow-[0_10px_24px_-14px_rgba(242,166,61,.9)]"
            >
              <span className="text-base font-normal leading-none" aria-hidden>+</span>
              Fund
            </Link>
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2.5 font-mono-num text-[8px] uppercase tracking-[0.09em] text-paper/45">
            <span>
              Spent <strong className="ml-1 font-semibold text-paper/80">{formatNaira(recentSpend, { compact: true })}</strong>
            </span>
            <span className="h-1 w-1 rounded-full bg-paper/20" />
            <span>
              Orders <strong className="ml-1 font-semibold text-paper/80">{lastTx.length}</strong>
            </span>
            <span className="h-1 w-1 rounded-full bg-paper/20" />
            <span>
              Live <strong className="ml-1 font-semibold text-paper/80">{operational}/{networkRows.length}</strong>
            </span>
          </div>
        </div>
      </section>

      <nav className="mb-5 grid grid-cols-4 gap-1.5" aria-label="Quick actions">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="pressable flex min-h-[66px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-line bg-white px-1 text-center shadow-[0_8px_24px_-22px_rgba(14,33,26,.65)]"
          >
            <DashboardIcon name={action.icon} className="h-[18px] w-[18px] text-green-deep" />
            <span className="text-[11px] font-semibold text-ink">{action.label}</span>
          </Link>
        ))}
      </nav>

      <section className="mb-5">
        <SectionHeading href="/history">Buy again</SectionHeading>
        {lastTx.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-ink/20 bg-white/45 px-4 py-4 text-center">
            <p className="text-[13px] font-medium text-ink/65">Your quick reorders will appear here.</p>
            <Link
              href="/services?service=data"
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

      <section className="mb-5">
        <SectionHeading>Services</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          {DASHBOARD_SERVICES.map((service, index) => (
            <Link
              key={service.href}
              href={service.href}
              className={cn(
                "pressable relative min-h-[124px] overflow-hidden rounded-[16px] border p-3.5 shadow-[0_12px_30px_-26px_rgba(14,33,26,.8)]",
                index === 0
                  ? "border-green-deep bg-green-deep text-paper"
                  : "border-line bg-white text-ink"
              )}
            >
              {index === 0 && (
                <span className="absolute right-2.5 top-2.5 rounded-md bg-amber px-1.5 py-0.5 font-mono-num text-[7px] font-bold uppercase tracking-wide text-[#2c1b02]">
                  Most used
                </span>
              )}
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-[10px]",
                  service.iconClass
                )}
              >
                <DashboardIcon name={service.icon} className="h-4 w-4" />
              </span>
              <div className="mt-4">
                <p
                  className={cn(
                    "font-mono-num text-[9px] font-semibold tracking-[0.14em]",
                    index === 0 ? "text-paper/45" : "text-ink/35"
                  )}
                >
                  {service.mono}
                </p>
                <p className="mt-0.5 text-[14px] font-bold">{service.label}</p>
                <p className={cn("mt-0.5 text-[11px]", index === 0 ? "text-paper/55" : "text-ink/48")}>
                  {service.blurb}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-5 rounded-[16px] border border-line bg-white p-3.5 shadow-[0_12px_32px_-28px_rgba(14,33,26,.8)]">
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
              className="flex min-h-9 items-center justify-between border-t border-line first:border-t-0"
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

      <section className="mb-3.5">
        <SectionHeading>Account</SectionHeading>
        <div className="overflow-hidden rounded-[16px] border border-line bg-white shadow-[0_12px_32px_-28px_rgba(14,33,26,.8)]">
          {ACCOUNT_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[58px] items-center gap-3 border-t border-line px-3.5 first:border-t-0"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-paper text-green-deep">
                <DashboardIcon name={item.icon} className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink">{item.label}</span>
                <span className="block truncate text-[10px] text-ink/40">
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
          className="flex min-h-10 items-center justify-center rounded-xl border border-line bg-white text-[11px] font-semibold text-ink/65"
        >
          Agent & API
        </Link>
        <Link
          href="/settings"
          className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white text-[11px] font-semibold text-ink/65"
        >
          <DashboardIcon name="settings" className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
