import Link from "next/link";
import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { RateTicker } from "@/components/layout/RateTicker";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { NetworkStatusBoard } from "@/components/landing/NetworkStatusBoard";
import { GuestPurchaseWidget } from "@/components/landing/GuestPurchaseWidget";
import { HeroPhoneImage } from "@/components/landing/HeroPhoneImage";
import { RateBoard } from "@/components/landing/RateBoard";
import { MarginCalculator } from "@/components/landing/MarginCalculator";
import { CountUp } from "@/components/motion/CountUp";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import type { NetworkCode } from "@/lib/phone";

async function getLandingData() {
  try {
    const [networks, plans, tickerSetting] = await Promise.all([
      prisma.network.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.plan.findMany({
        where: { isActive: true },
        include: { network: true },
        orderBy: { sortOrder: "asc" },
        take: 24,
      }),
      prisma.setting.findUnique({ where: { key: "ticker.items" } }),
    ]);
    return {
      networks: networks.map((n) => ({
        code: n.code as NetworkCode,
        name: n.name,
        status: n.status,
        uptimePct: Number(n.uptimePct),
      })),
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        sizeMb: p.sizeMb,
        validityDays: p.validityDays,
        retailPrice: Number(p.retailPrice),
        networkCode: p.network.code as NetworkCode,
      })),
      ticker: tickerSetting ? (JSON.parse(tickerSetting.value) as string[]) : undefined,
    };
  } catch {
    return { networks: undefined, plans: undefined, ticker: undefined };
  }
}

export default async function LandingPage() {
  const data = await getLandingData();

  return (
    <>
      <TopUtilityStrip />
      <RateTicker items={data.ticker} />

      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-green-deep font-display text-sm text-amber">
              DG
            </span>
            <span className="font-display text-lg tracking-wide text-ink sm:text-xl">
              DATAGRID
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link href="/rates" className="link-draw text-ink/70 hover:text-ink">
              Rates
            </Link>
            <Link href="/about" className="link-draw text-ink/70 hover:text-ink">
              Trust
            </Link>
            <Link href="#buy" className="link-draw text-ink/70 hover:text-ink">
              Buy
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href="/rates" className="md:hidden">
              <Button variant="ghost" size="sm">
                Rates
              </Button>
            </Link>
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Open grid</Button>
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero — control room split; buy widget first on mobile */}
        <section className="bg-grid-paper relative overflow-hidden border-b border-line">
          <div className="mx-auto grid max-w-7xl items-start gap-8 px-3 py-8 sm:px-4 sm:py-12 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-20">
            <div className="order-2 space-y-6 sm:space-y-8 lg:order-1 lg:col-span-7">
              <div>
                <HeroEnter delay={0}>
                  <p className="font-mono-num text-[10px] uppercase tracking-[0.18em] text-green sm:text-[11px] sm:tracking-[0.2em]">
                    National grid for your phone · NG
                  </p>
                </HeroEnter>
                <HeroEnter delay={80}>
                  <h1 className="font-display mt-3 text-[clamp(2.15rem,9vw,5.75rem)] leading-[0.95] text-ink sm:mt-5">
                    DATA IN TEN
                    <br />
                    SECONDS.
                    <br />
                    <span className="text-green">LIGHT IN TWENTY.</span>
                  </h1>
                </HeroEnter>
                <HeroEnter delay={160}>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/70 sm:mt-6 sm:text-lg">
                    Airtime, data, electricity tokens, cable TV, betting wallets, exam pins —
                    delivered with a status trail. Guest checkout. Reseller wholesale when you scale.
                  </p>
                </HeroEnter>

                <HeroEnter delay={220}>
                  <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <Link href="#buy" className="w-full sm:w-auto">
                      <Button size="lg" className="w-full sm:w-auto">
                        Buy without account
                      </Button>
                    </Link>
                    <Link href="/login" className="w-full sm:w-auto">
                      <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                        Agent / dashboard
                      </Button>
                    </Link>
                  </div>
                </HeroEnter>
              </div>

              <HeroEnter delay={300}>
                <div className="grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
                  <div className="surface p-3 sm:p-4">
                    <p className="font-mono-num text-[9px] tracking-widest text-ink/45 sm:text-[10px]">
                      DELIVERED
                    </p>
                    <p className="font-mono-num mt-1.5 text-lg font-semibold text-ink sm:mt-2 sm:text-2xl lg:text-3xl">
                      <CountUp value={412} prefix="₦" suffix="M" />
                    </p>
                  </div>
                  <div className="surface p-3 sm:p-4">
                    <p className="font-mono-num text-[9px] tracking-widest text-ink/45 sm:text-[10px]">
                      ORDERS
                    </p>
                    <p className="font-mono-num mt-1.5 text-lg font-semibold text-ink sm:mt-2 sm:text-2xl lg:text-3xl">
                      <CountUp value={96000} />
                    </p>
                  </div>
                  <div className="surface-deep p-3 sm:p-4">
                    <p className="font-mono-num text-[9px] tracking-widest text-amber sm:text-[10px]">
                      UPTIME
                    </p>
                    <p className="font-mono-num mt-1.5 text-lg font-semibold sm:mt-2 sm:text-2xl lg:text-3xl">
                      99.6%
                    </p>
                  </div>
                </div>
              </HeroEnter>

              <HeroEnter delay={380}>
                <div className="w-full max-w-md">
                  <NetworkStatusBoard networks={data.networks} />
                </div>
              </HeroEnter>
            </div>

            {/* Buy first on mobile so guests convert without scrolling past long copy */}
            <div
              id="buy"
              className="order-1 scroll-mt-20 lg:order-2 lg:col-span-5 lg:sticky lg:top-24"
            >
              <HeroEnter delay={120}>
                <GuestPurchaseWidget plans={data.plans} />
                <p className="font-mono-num mt-2 text-center text-[10px] tracking-wide text-ink/40 sm:mt-3">
                  LIVE WIDGET · GUEST ORDER · NO ACCOUNT
                </p>
              </HeroEnter>
            </div>
          </div>
        </section>

        <HeroPhoneImage />

        {/* Rate + margin desk */}
        <section className="mx-auto max-w-7xl px-3 py-12 sm:px-4 sm:py-16 lg:px-8 lg:py-20">
          <Reveal>
            <p className="font-mono-num text-[11px] tracking-[0.2em] text-ink/45">RATE DESK</p>
            <h2 className="font-display mt-2 text-3xl text-ink sm:text-4xl lg:text-5xl">
              PRICES ON THE GRID.
            </h2>
          </Reveal>
          <div className="mt-8 grid items-start gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-5 lg:gap-8">
            <Reveal className="min-w-0 lg:col-span-3" delay={60}>
              <RateBoard />
            </Reveal>
            <Reveal className="min-w-0 lg:col-span-2" delay={140}>
              <MarginCalculator />
            </Reveal>
          </div>
        </section>

        {/* Moats — asymmetric, aligned system */}
        <section className="bg-grid bg-grid-live py-12 text-paper sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
            <Reveal>
              <p className="font-mono-num text-[11px] tracking-[0.2em] text-amber">MOATS</p>
              <h2 className="font-display mt-3 text-[clamp(1.75rem,6vw,3.5rem)] leading-tight">
                Built for Nigeria.
                <br />
                Not a template.
              </h2>
            </Reveal>
            <ul className="moat-grid mt-8 sm:mt-12">
              {[
                ["Guest checkout", "Buy first. Account later — with this number."],
                ["Network auto-detect", "0803… snaps to MTN. Prefix map admin-editable."],
                ["Status board", "Live uptime dots on landing and dashboard."],
                ["Provider failover", "2+ VTU adapters. You never see the retry."],
                ["Scheduled top-ups", "1GB every Friday, 6pm WAT."],
                ["One-tap repeat", "Last 3 buys as chips on the home grid."],
              ].map(([t, d], i) => (
                <Reveal key={t} delay={i * 60} as="li">
                  <div className="h-full border border-white/10 bg-black/25 p-4 backdrop-blur-[1px] transition hover:border-amber/40 hover:bg-black/35 sm:p-6">
                    <p className="font-mono-num text-[10px] text-amber">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-2 text-base font-semibold sm:mt-3 sm:text-lg">{t}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-paper/65 sm:mt-2">{d}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-3 py-12 sm:px-4 sm:py-16 lg:px-8 lg:py-20">
          <Reveal>
            <h2 className="font-display text-3xl text-ink sm:text-4xl lg:text-5xl">FAQ</h2>
          </Reveal>
          <dl className="mt-8 space-y-0 sm:mt-10">
            {[
              [
                "Do I need an account?",
                "No. Guest checkout lets you buy data or airtime immediately. After delivery, save the number to track history.",
              ],
              [
                "How fast is delivery?",
                "Most data and airtime land in under 15 seconds via our provider router with automatic failover.",
              ],
              [
                "Can I become a reseller?",
                "Yes. Hit the lifetime volume threshold and agent tier unlocks wholesale rates plus API keys.",
              ],
            ].map(([q, a], i) => (
              <Reveal key={q} delay={i * 80}>
                <div className="border-b border-line py-4 sm:py-5">
                  <dt className="text-base font-semibold text-ink">{q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ink/65 sm:text-base">{a}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-line bg-green-deep text-paper">
        <div className="mx-auto grid max-w-7xl gap-8 px-3 py-10 sm:grid-cols-2 sm:gap-10 sm:px-4 sm:py-14 lg:grid-cols-4 lg:px-8">
          <div>
            <p className="font-display text-2xl text-amber">DATAGRID</p>
            <p className="mt-3 text-sm leading-relaxed text-paper/60">
              The national grid for your phone.
            </p>
          </div>
          <div>
            <p className="font-mono-num text-[10px] tracking-widest text-paper/40">LEGAL</p>
            <ul className="mt-3 space-y-2 text-sm text-paper/75">
              <li>
                <Link href="/legal/privacy" className="hover:text-amber">
                  NDPR Privacy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-amber">
                  Terms
                </Link>
              </li>
              <li>NIN-SIM notice applies</li>
              <li>18+ for betting products</li>
            </ul>
          </div>
          <div>
            <p className="font-mono-num text-[10px] tracking-widest text-paper/40">COMPANY</p>
            <ul className="mt-3 space-y-2 text-sm text-paper/75">
              <li>CAC RC ————</li>
              <li>
                <Link href="/about" className="hover:text-amber">
                  Trust &amp; about
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-amber">
                  Support
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-mono-num text-[10px] tracking-widest text-paper/40">NOTE</p>
            <p className="mt-3 text-sm leading-relaxed text-paper/60">
              Transactions final after delivery. Status trail on every order.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center font-mono-num text-[11px] text-paper/40">
          © {new Date().getFullYear()} DATAGRID · BUILT FOR NG
        </div>
      </footer>

      <WhatsAppFab />
    </>
  );
}
