import Link from "next/link";
import { formatNaira } from "@/lib/money";
import { NetworkStatusBoard } from "@/components/landing/NetworkStatusBoard";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";
import type { NetworkCode } from "@/lib/phone";

type Tx = {
  id: string;
  service: string;
  amount: number;
  phone: string | null;
  planId: string | null;
};

type Net = {
  code: NetworkCode;
  name: string;
  status: string;
  uptimePct: number;
};

const services = [
  { href: "/buy/data", label: "Data", mono: "DATA", accent: "#008751" },
  { href: "/buy/airtime", label: "Airtime", mono: "AIR", accent: "#FFB703" },
  { href: "/buy/electricity", label: "Power", mono: "KWH", accent: "#0B231A" },
  { href: "/buy/cable", label: "Cable", mono: "TV", accent: "#04291C" },
  { href: "/buy/betting", label: "Betting", mono: "BET", accent: "#E5484D" },
  { href: "/buy/pins", label: "Exam pins", mono: "PIN", accent: "#008751" },
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
  return (
    <div className="space-y-6 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <HeroEnter delay={0}>
            <p className="font-mono-num text-[11px] tracking-[0.16em] text-ink/45">
              CONTROL HOME
            </p>
          </HeroEnter>
          <HeroEnter delay={60}>
            <h1 className="font-display mt-1 text-3xl text-ink">
              {name.split(" ")[0].toUpperCase()}.
            </h1>
          </HeroEnter>
        </div>
        <HeroEnter delay={100}>
          <Link
            href="/wallet"
            className="surface-deep surface-interactive px-3 py-2 text-right text-paper"
          >
            <p className="font-mono-num text-[9px] text-amber">WALLET</p>
            <p className="font-mono-num text-sm font-semibold tabular-nums">
              {formatNaira(balance)}
            </p>
          </Link>
        </HeroEnter>
      </div>

      <Reveal delay={100}>
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-mono-num text-[11px] tracking-widest text-ink/50">
              ONE-TAP REPEAT
            </h2>
            <Link href="/history" className="link-draw text-xs text-green">
              History
            </Link>
          </div>
          {lastTx.length === 0 ? (
            <div className="surface border-dashed p-4 text-sm text-ink/55">
              No purchases yet. Fund wallet → buy data in four taps.
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {lastTx.map((t) => {
                const href =
                  t.service === "DATA"
                    ? `/buy/data?phone=${encodeURIComponent(t.phone || "")}&planId=${t.planId || ""}`
                    : `/buy/airtime?phone=${encodeURIComponent(t.phone || "")}&amount=${t.amount}`;
                return (
                  <Link
                    key={t.id}
                    href={href}
                    className="edge-card surface min-w-[148px] shrink-0 p-3 pressable"
                    style={{ borderLeftColor: "#008751" }}
                  >
                    <p className="font-mono-num text-[10px] text-ink/45">{t.service}</p>
                    <p className="font-mono-num mt-1 font-semibold text-green">
                      {formatNaira(t.amount, { compact: true })}
                    </p>
                    <p className="mt-1 truncate text-xs text-ink/60">{t.phone}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </Reveal>

      <section>
        <Reveal delay={140}>
          <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/50">
            SERVICES
          </h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-3">
          {services.map((s, i) => (
            <Reveal key={s.href} delay={160 + i * 45}>
              <Link
                href={s.href}
                className={
                  i === 0
                    ? "surface-deep surface-interactive col-span-2 block p-4"
                    : "surface surface-interactive block p-4"
                }
              >
                <p
                  className="font-mono-num text-[10px] tracking-widest"
                  style={{ color: i === 0 ? "#FFB703" : s.accent }}
                >
                  {s.mono}
                </p>
                <p
                  className={`mt-2 font-semibold ${i === 0 ? "text-xl text-paper" : "text-lg"}`}
                >
                  {s.label}
                </p>
                {i === 0 && (
                  <p className="mt-1 text-sm text-paper/60">
                    Wallet debit · PIN · provider trail
                  </p>
                )}
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal delay={420}>
        <section className="surface-deep overflow-hidden p-1">
          <NetworkStatusBoard networks={networks.length ? networks : undefined} />
        </section>
      </Reveal>

      <div className="grid grid-cols-2 gap-3">
        {[
          { href: "/wallet", mono: "WALLET", label: "Fund · Ledger", accent: "text-ink/45" },
          { href: "/referrals", mono: "AGENTS", label: "Referrals", accent: "text-amber" },
          { href: "/schedules", mono: "AUTO", label: "Schedules", accent: "text-ink/45" },
          { href: "/agent", mono: "API", label: "Reseller", accent: "text-green" },
        ].map((item, i) => (
          <Reveal key={item.href} delay={480 + i * 40}>
            <Link href={item.href} className="surface surface-interactive block p-4">
              <p className={`font-mono-num text-[10px] ${item.accent}`}>{item.mono}</p>
              <p className="mt-1 font-semibold">{item.label}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

export { services as DASHBOARD_SERVICES };
