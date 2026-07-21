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
    blurb: "SME · Gifting",
    accent: "#008751",
  },
  {
    href: "/buy/airtime",
    label: "Airtime",
    mono: "AIR",
    blurb: "₦50–100k",
    accent: "#C9A227",
  },
  {
    href: "/buy/electricity",
    label: "Power",
    mono: "KWH",
    blurb: "Tokens",
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
    blurb: "Top-up",
    accent: "#C93B40",
  },
  {
    href: "/buy/pins",
    label: "Exam pins",
    mono: "PIN",
    blurb: "WAEC",
    accent: "#008751",
  },
];

const moreLinks = [
  { href: "/wallet", label: "Wallet & fund", mono: "01" },
  { href: "/history", label: "History", mono: "02" },
  { href: "/schedules", label: "Schedules", mono: "03" },
  { href: "/referrals", label: "Referrals", mono: "04" },
  { href: "/agent", label: "Agent / API", mono: "05" },
  { href: "/settings", label: "Settings", mono: "06" },
];

const quickActions = [
  { href: "/buy/data", label: "Data" },
  { href: "/buy/airtime", label: "Airtime" },
  { href: "/buy/electricity", label: "Power" },
  { href: "/history", label: "History" },
];

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
    <div className="space-y-3.5 px-3 py-3 pb-5">
      {/* Compact header */}
      <div>
        <HeroEnter delay={0}>
          <p className="font-mono-num text-[9px] uppercase tracking-[0.16em] text-ink/40">
            Control home
          </p>
        </HeroEnter>
        <HeroEnter delay={40}>
          <h1 className="font-display text-xl leading-none text-ink">
            {first.toUpperCase()}.
          </h1>
        </HeroEnter>
      </div>

      {/* Compact main wallet (restored, smaller) */}
      <HeroEnter delay={70}>
        <section className="overflow-hidden rounded-xl bg-green-deep text-paper">
          <div className="bg-grid flex items-center justify-between gap-3 px-3.5 py-3">
            <div className="min-w-0">
              <p className="font-mono-num text-[8px] tracking-[0.14em] text-amber/90">
                MAIN WALLET
              </p>
              <p className="font-mono-num mt-1 text-xl font-semibold leading-none tabular-nums">
                {formatNaira(balance)}
              </p>
            </div>
            <Link
              href="/wallet"
              className="pressable shrink-0 rounded-lg bg-amber px-3 py-2 text-[11px] font-semibold text-ink"
            >
              Fund
            </Link>
          </div>
        </section>
      </HeroEnter>

      {/* Fast path */}
      <HeroEnter delay={100}>
        <section>
          <p className="font-mono-num mb-1.5 text-[9px] tracking-[0.14em] text-ink/40">
            FAST PATH
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="pressable flex flex-col items-center justify-center rounded-xl border border-line bg-paper px-1 py-2 text-center"
              >
                <span className="text-[11px] font-semibold leading-tight text-ink">
                  {a.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </HeroEnter>

      {/* Compact rebuy */}
      <Reveal delay={120}>
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="font-mono-num text-[9px] tracking-[0.14em] text-ink/40">
              REBUY
            </p>
            <Link href="/history" className="font-mono-num text-[9px] text-green">
              ALL →
            </Link>
          </div>
          {lastTx.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-3 py-3 text-center">
              <p className="text-[11px] text-ink/50">No orders yet.</p>
              <Link
                href="/buy/data"
                className="font-mono-num mt-1 inline-block text-[9px] text-green"
              >
                BUY DATA →
              </Link>
            </div>
          ) : (
            <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {lastTx.map((t) => {
                const href =
                  t.service === "DATA"
                    ? `/buy/data?phone=${encodeURIComponent(t.phone || "")}&planId=${t.planId || ""}`
                    : `/buy/airtime?phone=${encodeURIComponent(t.phone || "")}&amount=${t.amount}`;
                return (
                  <Link
                    key={t.id}
                    href={href}
                    className="pressable min-w-[112px] shrink-0 rounded-xl border border-line bg-paper px-2.5 py-2"
                  >
                    <p className="font-mono-num text-[8px] tracking-wide text-ink/40">
                      {t.service}
                    </p>
                    <p className="font-mono-num mt-0.5 text-sm font-semibold tabular-nums text-ink">
                      {formatNaira(t.amount, { compact: true })}
                    </p>
                    <p className="mt-0.5 truncate font-mono-num text-[9px] leading-none text-ink/35">
                      {t.phone || "—"}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </Reveal>

      {/* Compact services */}
      <section>
        <Reveal delay={150}>
          <p className="font-mono-num mb-1.5 text-[9px] tracking-[0.14em] text-ink/40">
            SERVICES
          </p>
        </Reveal>
        <div className="grid grid-cols-3 gap-1.5">
          {services.map((s, i) => (
            <Reveal key={s.href} delay={160 + i * 30}>
              <Link
                href={s.href}
                className={cn(
                  "pressable block rounded-xl border px-2 py-2.5",
                  i === 0
                    ? "border-green/25 bg-green-deep text-paper"
                    : "border-line bg-paper"
                )}
              >
                <p
                  className={cn(
                    "font-mono-num text-[8px] tracking-wide",
                    i === 0 ? "text-amber/90" : "text-ink/40"
                  )}
                >
                  {s.mono}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[12px] font-semibold leading-tight",
                    i === 0 ? "text-paper" : "text-ink"
                  )}
                >
                  {s.label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 truncate text-[9px] leading-tight",
                    i === 0 ? "text-paper/45" : "text-ink/40"
                  )}
                >
                  {s.blurb}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Tiny network row */}
      <Reveal delay={300}>
        <section className="rounded-xl border border-line bg-paper px-2.5 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="font-mono-num text-[9px] tracking-[0.12em] text-ink/40">
              NET · {operational}/{netCount}
            </p>
            <span className="font-mono-num text-[8px] text-green">LIVE</span>
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
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
            ).map((n) => (
              <li key={n.code} className="flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      n.status === "OPERATIONAL"
                        ? NETWORK_COLORS[n.code]
                        : "#E5484D",
                  }}
                />
                <span className="text-[10px] font-medium text-ink/70">{n.name}</span>
                <span className="font-mono-num text-[8px] text-ink/35">
                  {Number(n.uptimePct).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      {/* Compact more list */}
      <Reveal delay={340}>
        <section className="overflow-hidden rounded-xl border border-line bg-paper">
          {moreLinks.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-[12px]",
                i > 0 && "border-t border-line"
              )}
            >
              <span className="font-mono-num w-5 text-[8px] text-ink/30">{item.mono}</span>
              <span className="flex-1 font-medium text-ink">{item.label}</span>
              <span className="font-mono-num text-[9px] text-ink/25">→</span>
            </Link>
          ))}
        </section>
      </Reveal>
    </div>
  );
}

export { services as DASHBOARD_SERVICES };
