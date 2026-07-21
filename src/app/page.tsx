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

      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-green-deep font-display text-sm text-amber">
              DG
            </span>
            <span className="font-display text-xl tracking-wide text-ink">DATAGRID</span>
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
          <div className="flex items-center gap-2">
            <Link href="/login">
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
        {/* Hero — control room split */}
        <section className="bg-grid-paper relative overflow-hidden border-b border-line">
          <div className="mx-auto grid max-w-7xl items-start gap-10 px-4 py-12 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-20">
            <div className="lg:col-span-7">
              <HeroEnter delay={0}>
                <p className="font-mono-num text-[11px] uppercase tracking-[0.2em] text-green">
                  National grid for your phone · NG
                </p>
              </HeroEnter>
              <HeroEnter delay={80}>
                <h1 className="font-display mt-5 text-[clamp(2.75rem,8vw,5.75rem)] text-ink">
                  DATA IN TEN
                  <br />
                  SECONDS.
                  <br />
                  <span className="text-green">LIGHT IN TWENTY.</span>
                </h1>
              </HeroEnter>
              <HeroEnter delay={160}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">
                  Airtime, data, electricity tokens, cable TV, betting wallets, exam pins —
                  delivered with a status trail. Guest checkout. Reseller wholesale when you scale.
                </p>
              </HeroEnter>

              <HeroEnter delay={220}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="#buy">
                    <Button size="lg">Buy without account</Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="secondary">
                      Agent / dashboard
                    </Button>
                  </Link>
                </div>
              </HeroEnter>

              <HeroEnter delay={300}>
                <div className="mt-12 grid max-w-xl grid-cols-3 gap-3">
                  <div className="surface p-4">
                    <p className="font-mono-num text-[10px] tracking-widest text-ink/45">
                      DELIVERED
                    </p>
                    <p className="font-mono-num mt-2 text-2xl font-semibold text-ink lg:text-3xl">
                      <CountUp value={412} prefix="₦" suffix="M" />
                    </p>
                  </div>
                  <div className="surface p-4">
                    <p className="font-mono-num text-[10px] tracking-widest text-ink/45">ORDERS</p>
                    <p className="font-mono-num mt-2 text-2xl font-semibold text-ink lg:text-3xl">
                      <CountUp value={96000} />
                    </p>
                  </div>
                  <div className="surface-deep p-4">
                    <p className="font-mono-num text-[10px] tracking-widest text-amber">UPTIME</p>
                    <p className="font-mono-num mt-2 text-2xl font-semibold lg:text-3xl">99.6%</p>
                  </div>
                </div>
              </HeroEnter>

              <HeroEnter delay={380}>
                <div className="mt-8 max-w-md">
                  <NetworkStatusBoard networks={data.networks} />
                </div>
              </HeroEnter>
            </div>

            <div id="buy" className="lg:col-span-5 lg:sticky lg:top-24">
              <HeroEnter delay={200}>
                <GuestPurchaseWidget plans={data.plans} />
                <p className="font-mono-num mt-3 text-center text-[10px] tracking-wide text-ink/40">
                  LIVE WIDGET · GUEST ORDER · NO ACCOUNT
                </p>
              </HeroEnter>
            </div>
          </div>
        </section>

        <HeroPhoneImage />

        {/* Rate + margin desk */}
        <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <Reveal>
            <p className="font-mono-num text-[11px] tracking-[0.2em] text-ink/45">RATE DESK</p>
            <h2 className="font-display mt-2 text-4xl text-ink lg:text-5xl">
              PRICES ON THE GRID.
            </h2>
          </Reveal>
          <div className="mt-10 grid items-start gap-6 lg:grid-cols-5 lg:gap-8">
            <Reveal className="lg:col-span-3" delay={60}>
              <RateBoard />
            </Reveal>
            <Reveal className="lg:col-span-2" delay={140}>
              <MarginCalculator />
            </Reveal>
          </div>
        </section>

        {/* Moats — asymmetric, aligned system */}
        <section className="bg-grid bg-grid-live py-20 text-paper">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <Reveal>
              <p className="font-mono-num text-[11px] tracking-[0.2em] text-amber">MOATS</p>
              <h2 className="font-display mt-3 text-[clamp(2rem,5vw,3.5rem)]">
                Built for Nigeria.
                <br />
                Not a template.
              </h2>
            </Reveal>
            <ul className="moat-grid mt-12">
              {[
                ["Guest checkout", "Buy first. Account later — with this number."],
                ["Network auto-detect", "0803… snaps to MTN. Prefix map admin-editable."],
                ["Status board", "Live uptime dots on landing and dashboard."],
                ["Provider failover", "2+ VTU adapters. You never see the retry."],
                ["Scheduled top-ups", "1GB every Friday, 6pm WAT."],
                ["One-tap repeat", "Last 3 buys as chips on the home grid."],
              ].map(([t, d], i) => (
                <Reveal key={t} delay={i * 60} as="li">
                  <div className="h-full border border-white/10 bg-black/25 p-6 backdrop-blur-[1px] transition hover:border-amber/40 hover:bg-black/35">
                    <p className="font-mono-num text-[10px] text-amber">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-3 text-lg font-semibold">{t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-paper/65">{d}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-20 lg:px-8">
          <Reveal>
            <h2 className="font-display text-4xl text-ink lg:text-5xl">FAQ</h2>
          </Reveal>
          <dl className="mt-10 space-y-0">
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
                <div className="border-b border-line py-5">
                  <dt className="text-base font-semibold text-ink">{q}</dt>
                  <dd className="mt-2 leading-relaxed text-ink/65">{a}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-line bg-green-deep text-paper">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
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
