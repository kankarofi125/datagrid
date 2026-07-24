import Link from "next/link";
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
import { cached, CacheKeys, CacheTags } from "@/lib/cache";

// Live catalog data is served through the shared Redis + stale local cache.
export const dynamic = "force-dynamic";

async function getLandingData() {
  try {
    return await cached(
      CacheKeys.landing(),
      async () => {
        const [networks, plans, tickerSetting] = await Promise.all([
          prisma.network.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          }),
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
      },
      { ttl: 60, staleTtl: 3600, tags: [CacheTags.catalog] }
    );
  } catch {
    return { networks: undefined, plans: undefined, ticker: undefined };
  }
}

export default async function LandingPage() {
  const data = await getLandingData();

  return (
    <>
      <RateTicker items={data.ticker} />

      <header className="sticky top-2 z-30 mx-2 mt-2 rounded-[18px] border border-white/80 bg-paper/92 shadow-[0_18px_48px_-30px_rgba(14,33,26,.38)] backdrop-blur-xl sm:mx-3 lg:mx-auto lg:w-[calc(100%-2rem)] lg:max-w-7xl">
        <div className="mx-auto flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-deep font-display text-sm text-amber shadow-[0_10px_24px_-16px_rgba(10,46,34,.9)]">
              DG
            </span>
            <span>
              <span className="block font-display text-lg tracking-wide text-ink sm:text-xl">
                DATAGRID
              </span>
              <span className="hidden font-mono-num text-[7px] uppercase tracking-[0.16em] text-ink/35 sm:block">
                Payments infrastructure
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 rounded-full border border-line bg-white/60 px-5 py-2 text-sm font-medium md:flex">
            <Link href="#services" className="link-draw text-ink/70 hover:text-ink">
              Services
            </Link>
            <Link href="/rates" className="link-draw text-ink/70 hover:text-ink">
              Rates
            </Link>
            <Link href="/about" className="link-draw text-ink/70 hover:text-ink">
              Trust
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

      <main id="main" className="overflow-hidden">
        <section className="relative border-b border-line bg-[radial-gradient(circle_at_85%_8%,rgba(242,166,61,.16),transparent_27%),radial-gradient(circle_at_4%_75%,rgba(22,134,83,.08),transparent_25%),linear-gradient(180deg,#f8f6f0_0%,#efebe1_100%)]">
          <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-amber/10 blur-3xl" aria-hidden />
          <div className="mx-auto grid max-w-7xl items-start gap-8 px-3 py-10 sm:px-4 sm:py-14 lg:grid-cols-12 lg:gap-14 lg:px-8 lg:py-20">
            <div className="space-y-6 sm:space-y-8 lg:col-span-7 lg:pt-3">
              <div>
                <HeroEnter delay={0}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-green/15 bg-white/65 px-3 py-1.5 shadow-sm backdrop-blur">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-green" />
                    <p className="font-mono-num text-[9px] font-semibold uppercase tracking-[0.16em] text-green sm:text-[10px]">
                      All Nigerian networks operational
                    </p>
                  </div>
                </HeroEnter>
                <HeroEnter delay={80}>
                  <h1 className="font-display mt-5 text-[clamp(2.6rem,10vw,5.9rem)] leading-[0.92] text-ink">
                    DATA IN TEN
                    <br />
                    SECONDS.
                    <br />
                    <span className="text-green">LIGHT IN TWENTY.</span>
                  </h1>
                </HeroEnter>
                <HeroEnter delay={160}>
                  <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink/65 sm:mt-6 sm:text-lg">
                    Data, airtime, electricity, cable TV and exam pins—delivered with
                    clear status tracking, instant receipts and automatic refunds when
                    a provider fails.
                  </p>
                </HeroEnter>

                <HeroEnter delay={220}>
                  <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <Link href="#buy" className="w-full sm:w-auto">
                      <Button size="lg" className="w-full px-6 sm:w-auto">
                        Buy now
                      </Button>
                    </Link>
                    <Link href="/login" className="w-full sm:w-auto">
                      <Button size="lg" variant="ghost" className="w-full bg-white/55 sm:w-auto">
                        Open dashboard
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono-num text-[9px] uppercase tracking-wide text-ink/38">
                    <span>✓ No account required</span>
                    <span>✓ Receipt on every order</span>
                    <span>✓ Auto-refund</span>
                  </div>
                </HeroEnter>
              </div>

              <HeroEnter delay={300}>
                <div className="grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
                  <div className="rounded-2xl border border-line bg-white/70 p-3 shadow-sm backdrop-blur sm:p-4">
                    <p className="font-mono-num text-[9px] tracking-widest text-ink/45 sm:text-[10px]">
                      DELIVERED
                    </p>
                    <p className="font-mono-num mt-1.5 text-lg font-semibold text-ink sm:mt-2 sm:text-2xl lg:text-3xl">
                      <CountUp value={412} prefix="₦" suffix="M" />
                    </p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/70 p-3 shadow-sm backdrop-blur sm:p-4">
                    <p className="font-mono-num text-[9px] tracking-widest text-ink/45 sm:text-[10px]">
                      ORDERS
                    </p>
                    <p className="font-mono-num mt-1.5 text-lg font-semibold text-ink sm:mt-2 sm:text-2xl lg:text-3xl">
                      <CountUp value={96000} />
                    </p>
                  </div>
                  <div className="rounded-2xl bg-green-deep p-3 text-paper shadow-[0_18px_42px_-28px_rgba(10,46,34,.9)] sm:p-4">
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
                <div className="hidden w-full max-w-md lg:block">
                  <NetworkStatusBoard networks={data.networks} />
                </div>
              </HeroEnter>
            </div>

            <div
              id="buy"
              className="scroll-mt-20 lg:col-span-5 lg:sticky lg:top-24"
            >
              <HeroEnter delay={120}>
                <div className="rounded-[24px] bg-white/55 p-2 shadow-[0_32px_80px_-38px_rgba(10,46,34,.55)] ring-1 ring-white/80 backdrop-blur-sm">
                  <GuestPurchaseWidget plans={data.plans} />
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 font-mono-num text-[9px] uppercase tracking-[0.12em] text-ink/38">
                  <span className="h-1.5 w-1.5 rounded-full bg-green" />
                  Secure guest checkout
                </div>
                <div className="mt-5 lg:hidden">
                  <NetworkStatusBoard networks={data.networks} />
                </div>
              </HeroEnter>
            </div>
          </div>
        </section>

        <section id="services" className="bg-paper py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
            <Reveal>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.18em] text-green">
                    One reliable checkout
                  </p>
                  <h2 className="font-display mt-2 text-3xl text-ink sm:text-4xl">
                    FIVE THINGS. ONE GRID.
                  </h2>
                </div>
                <p className="max-w-md text-sm leading-relaxed text-ink/50">
                  Everyday digital payments in one clean account, with a single wallet and
                  a receipt trail you can trust.
                </p>
              </div>
            </Reveal>
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {[
                ["01", "Data", "SME · Gifting"],
                ["02", "Airtime", "All networks"],
                ["03", "Electricity", "Instant tokens"],
                ["04", "Cable TV", "DStv · GOtv"],
                ["05", "Exam pins", "WAEC · NECO"],
              ].map(([number, title, detail], index) => (
                <Reveal key={title} delay={index * 50}>
                  <Link
                    href="/login"
                    className="group block h-full rounded-2xl border border-line bg-white p-4 shadow-[0_12px_34px_-30px_rgba(14,33,26,.5)] transition hover:-translate-y-1 hover:border-green/25 hover:shadow-[0_20px_42px_-28px_rgba(14,33,26,.45)] sm:p-5"
                  >
                    <span className="font-mono-num text-[9px] font-semibold text-green/60">
                      {number}
                    </span>
                    <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
                    <p className="mt-1 font-mono-num text-[9px] uppercase tracking-wide text-ink/38">
                      {detail}
                    </p>
                    <span className="mt-4 block text-xs font-semibold text-green opacity-0 transition group-hover:opacity-100">
                      Get started →
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <HeroPhoneImage />

        {/* Rate + margin desk */}
        <section className="bg-[#efebe1] py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
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
          </div>
        </section>

        {/* Moats — asymmetric, aligned system */}
        <section className="bg-[radial-gradient(circle_at_85%_15%,rgba(242,166,61,.13),transparent_25%),linear-gradient(145deg,#123b2a,#0a2e22)] py-12 text-paper sm:py-16 lg:py-20">
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
                  <div className="h-full rounded-2xl bg-white/[0.065] p-4 shadow-[0_16px_40px_-32px_rgba(0,0,0,.8)] transition hover:-translate-y-1 hover:bg-white/[0.09] sm:p-6">
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
        <section className="mx-auto max-w-4xl px-3 py-12 sm:px-4 sm:py-16 lg:px-8 lg:py-20">
          <Reveal>
            <h2 className="font-display text-3xl text-ink sm:text-4xl lg:text-5xl">FAQ</h2>
          </Reveal>
          <dl className="mt-8 grid gap-2.5 sm:mt-10">
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
                <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_12px_32px_-30px_rgba(14,33,26,.45)] sm:p-5">
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
              <li>Receipts retained for your records</li>
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

      <WhatsAppFab hideOnMobile />
    </>
  );
}
