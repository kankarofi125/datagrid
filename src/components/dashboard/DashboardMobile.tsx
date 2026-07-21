import Link from "next/link";
import { formatNaira } from "@/lib/money";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";
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

/** Shared with desktop service grid */
const services = [
  {
    href: "/buy/data",
    label: "Data",
    mono: "DATA",
    blurb: "SME · Gifting · Retail",
    accent: "#008751",
  },
  {
    href: "/buy/airtime",
    label: "Airtime",
    mono: "AIR",
    blurb: "₦50 – ₦100k",
    accent: "#C9A227",
  },
  {
    href: "/buy/electricity",
    label: "Power",
    mono: "KWH",
    blurb: "Disco tokens",
    accent: "#0B231A",
  },
  {
    href: "/buy/cable",
    label: "Cable",
    mono: "TV",
    blurb: "DStv · GOtv",
    accent: "#04291C",
  },
  {
    href: "/buy/betting",
    label: "Betting",
    mono: "BET",
    blurb: "Wallet top-up",
    accent: "#C93B40",
  },
  {
    href: "/buy/pins",
    label: "Exam pins",
    mono: "PIN",
    blurb: "WAEC · NECO",
    accent: "#008751",
  },
];

const moreLinks = [
  { href: "/wallet", label: "Fund wallet", mono: "01" },
  { href: "/history", label: "History", mono: "02" },
  { href: "/schedules", label: "Schedules", mono: "03" },
  { href: "/referrals", label: "Referrals", mono: "04" },
  { href: "/agent", label: "Agent / API", mono: "05" },
  { href: "/settings", label: "Settings", mono: "06" },
];

function greeting() {
  // Server-safe generic; avoids hydration mismatch
  return "Operator desk";
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
  const operational = networks.filter((n) => n.status === "OPERATIONAL").length;
  const netCount = networks.length || 4;

  return (
    <div className="pb-4">
      {/* —— Greeting —— */}
      <div className="px-4 pt-5">
        <HeroEnter delay={0}>
          <div className="flex items-center gap-2">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-green" />
            <p className="font-mono-num text-[10px] uppercase tracking-[0.18em] text-ink/45">
              {greeting()} · live
            </p>
          </div>
        </HeroEnter>
        <HeroEnter delay={50}>
          <h1 className="font-display mt-2 text-[2.35rem] leading-none text-ink">
            {first.toUpperCase()}.
          </h1>
        </HeroEnter>
        <HeroEnter delay={90}>
          <p className="mt-1.5 text-sm text-ink/55">Your grid. Ready when you are.</p>
        </HeroEnter>
      </div>

      {/* —— Premium wallet instrument —— */}
      <HeroEnter delay={120}>
        <section className="mx-4 mt-5 overflow-hidden rounded-2xl bg-green-deep text-paper shadow-[0_20px_48px_-20px_rgba(4,41,28,0.55)]">
          <div className="bg-grid relative px-5 pb-5 pt-5">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-amber/10 blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="font-mono-num text-[10px] tracking-[0.16em] text-amber/90">
                  MAIN WALLET
                </p>
                <p className="font-mono-num mt-2 text-[2rem] font-semibold leading-none tracking-tight tabular-nums">
                  {formatNaira(balance)}
                </p>
                <p className="mt-2 text-xs text-paper/50">Available to spend</p>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
                <p className="font-mono-num text-[9px] tracking-wide text-amber">NGN</p>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-2">
              <Link
                href="/wallet"
                className="pressable flex items-center justify-center rounded-xl bg-amber py-3 text-sm font-semibold text-ink"
              >
                Fund wallet
              </Link>
              <Link
                href="/history"
                className="pressable flex items-center justify-center rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-paper"
              >
                View history
              </Link>
            </div>
          </div>
        </section>
      </HeroEnter>

      {/* —— One-tap repeat —— */}
      <Reveal delay={160}>
        <section className="mt-7 px-4">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="font-mono-num text-[10px] tracking-[0.16em] text-ink/40">
                QUICK REBUY
              </p>
              <h2 className="mt-0.5 text-base font-semibold text-ink">Repeat last buys</h2>
            </div>
            <Link
              href="/history"
              className="font-mono-num text-[10px] tracking-wide text-green"
            >
              ALL →
            </Link>
          </div>

          {lastTx.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-paper/80 px-4 py-6 text-center">
              <p className="text-sm text-ink/55">No delivered orders yet.</p>
              <Link
                href="/buy/data"
                className="mt-3 inline-flex font-mono-num text-[11px] tracking-wide text-green"
              >
                BUY DATA →
              </Link>
            </div>
          ) : (
            <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {lastTx.map((t) => {
                const href =
                  t.service === "DATA"
                    ? `/buy/data?phone=${encodeURIComponent(t.phone || "")}&planId=${t.planId || ""}`
                    : `/buy/airtime?phone=${encodeURIComponent(t.phone || "")}&amount=${t.amount}`;
                return (
                  <Link
                    key={t.id}
                    href={href}
                    className="pressable group relative min-w-[156px] shrink-0 overflow-hidden rounded-2xl border border-line bg-paper p-3.5 shadow-[0_8px_24px_-16px_rgba(11,35,26,0.25)]"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 bg-green" aria-hidden />
                    <div className="flex items-center justify-between gap-2 pl-1">
                      <p className="font-mono-num text-[9px] tracking-wider text-ink/40">
                        {t.service}
                      </p>
                      <span className="rounded-full bg-green/10 px-1.5 py-0.5 font-mono-num text-[8px] text-green">
                        REBUY
                      </span>
                    </div>
                    <p className="font-mono-num mt-2 pl-1 text-lg font-semibold tabular-nums text-ink">
                      {formatNaira(t.amount, { compact: true })}
                    </p>
                    <p className="mt-1 truncate pl-1 font-mono-num text-[11px] text-ink/50">
                      {t.phone || "—"}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </Reveal>

      {/* —— Primary services —— */}
      <section className="mt-8 px-4">
        <Reveal delay={200}>
          <div className="mb-3">
            <p className="font-mono-num text-[10px] tracking-[0.16em] text-ink/40">
              SERVICES
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-ink">What do you need?</h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-2.5">
          {services.map((s, i) => {
            const featured = i === 0;
            return (
              <Reveal
                key={s.href}
                delay={220 + i * 40}
                className={featured ? "col-span-2" : undefined}
              >
                <Link
                  href={s.href}
                  className={cn(
                    "pressable group relative block overflow-hidden rounded-2xl border transition",
                    featured
                      ? "border-green/20 bg-green-deep p-5 text-paper shadow-[0_16px_40px_-20px_rgba(4,41,28,0.5)]"
                      : "border-line bg-paper p-4 shadow-[0_6px_20px_-14px_rgba(11,35,26,0.2)] hover:border-green/30"
                  )}
                >
                  {featured && (
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.07]"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(243,244,236,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(243,244,236,.9) 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                      }}
                      aria-hidden
                    />
                  )}
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={cn(
                          "font-mono-num text-[10px] tracking-[0.14em]",
                          featured ? "text-amber" : "text-ink/40"
                        )}
                      >
                        {s.mono}
                      </p>
                      <p
                        className={cn(
                          "mt-1.5 font-semibold",
                          featured ? "text-2xl text-paper" : "text-base text-ink"
                        )}
                      >
                        {s.label}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          featured ? "text-paper/55" : "text-ink/45"
                        )}
                      >
                        {s.blurb}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-mono-num mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px]",
                        featured
                          ? "bg-amber/20 text-amber"
                          : "bg-green-deep/[0.06] text-ink/40 group-hover:bg-green/10 group-hover:text-green"
                      )}
                    >
                      →
                    </span>
                  </div>
                  {featured && (
                    <p className="relative mt-4 font-mono-num text-[10px] tracking-wide text-paper/40">
                      PIN CONFIRM · PROVIDER TRAIL · RECEIPT
                    </p>
                  )}
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* —— Network pulse strip —— */}
      <Reveal delay={400}>
        <section className="mx-4 mt-7 overflow-hidden rounded-2xl border border-line bg-paper">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="font-mono-num text-[10px] tracking-[0.16em] text-ink/40">
                NETWORKS
              </p>
              <p className="mt-0.5 text-sm font-semibold text-ink">
                {operational}/{netCount} operational
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green/10 px-2.5 py-1 font-mono-num text-[9px] font-semibold text-green">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-green" />
              LIVE
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-px bg-line/60 sm:grid-cols-4">
            {(networks.length
              ? networks
              : ([
                  { code: "MTN", name: "MTN", status: "OPERATIONAL", uptimePct: 99.7 },
                  { code: "GLO", name: "Glo", status: "OPERATIONAL", uptimePct: 99.4 },
                  { code: "AIRTEL", name: "Airtel", status: "OPERATIONAL", uptimePct: 99.6 },
                  {
                    code: "NINEMOBILE",
                    name: "9mobile",
                    status: "OPERATIONAL",
                    uptimePct: 99.2,
                  },
                ] as Net[])
            ).map((n) => {
              const ok = n.status === "OPERATIONAL";
              return (
                <li key={n.code} className="bg-paper px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: ok ? NETWORK_COLORS[n.code] : "#E5484D",
                      }}
                    />
                    <span className="truncate text-xs font-semibold text-ink">{n.name}</span>
                  </div>
                  <p className="font-mono-num mt-1.5 text-[10px] text-ink/45">
                    {Number(n.uptimePct).toFixed(1)}%
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </Reveal>

      {/* —— More —— */}
      <Reveal delay={460}>
        <section className="mt-7 px-4 pb-2">
          <p className="font-mono-num mb-3 text-[10px] tracking-[0.16em] text-ink/40">
            MORE
          </p>
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            {moreLinks.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 transition hover:bg-green-deep/[0.03]",
                  i > 0 && "border-t border-line"
                )}
              >
                <span className="font-mono-num w-6 text-[10px] text-ink/30">{item.mono}</span>
                <span className="flex-1 text-sm font-medium text-ink">{item.label}</span>
                <span className="font-mono-num text-[10px] text-ink/25">→</span>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}

export { services as DASHBOARD_SERVICES };
