import Link from "next/link";
import { RateTicker } from "@/components/layout/RateTicker";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { NetworkStatusBoard } from "@/components/landing/NetworkStatusBoard";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { RateBoard } from "@/components/landing/RateBoard";
import { MarginCalculator } from "@/components/landing/MarginCalculator";
import { CountUp } from "@/components/motion/CountUp";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { GoogleOneTapHost } from "@/components/auth/GoogleOneTapHost";
import { prisma } from "@/lib/db";
import type { NetworkCode } from "@/lib/phone";
import { cached, CacheKeys, CacheTags, CacheTTL } from "@/lib/cache";
import { createPublicMetadata, SITE_DESCRIPTION } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = createPublicMetadata({
  title: "DataGrid Nigeria — Buy Data, Airtime & Pay Bills",
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: [
    "buy data Nigeria",
    "buy airtime Nigeria",
    "pay electricity bill Nigeria",
    "pay DStv online",
    "VTU platform Nigeria",
  ],
});

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
          ticker: tickerSetting
            ? (JSON.parse(tickerSetting.value) as string[])
            : undefined,
        };
      },
      { ttl: CacheTTL.catalog, staleTtl: 3600, tags: [CacheTags.catalog] }
    );
  } catch {
    return { networks: undefined, plans: undefined, ticker: undefined };
  }
}

export default async function LandingPage() {
  const data = await getLandingData();

  return (
    <>
      <ScrollProgress />
      <RateTicker items={data.ticker} />
      {/* Google One Tap — soft continue card for signed-in Google browsers */}
      <GoogleOneTapHost context="signin" />

      <header className="sticky top-2 z-30 mx-3 mt-2 rounded-2xl border border-white/80 bg-paper/92 shadow-[0_18px_48px_-30px_rgba(14,33,26,.38)] backdrop-blur-xl sm:mx-5 lg:mx-auto lg:w-[calc(100%-4rem)] lg:max-w-6xl">
        <div className="mx-auto flex items-center justify-between gap-2 px-3 py-2 sm:px-4 lg:px-5">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5"
            aria-label="DataGrid home"
          >
            <BrandLogo priority className="w-9 sm:w-10" alt="DataGrid" />
            <span className="font-display min-w-0 text-[1.15rem] leading-none tracking-tight text-ink sm:text-[1.35rem]">
              DataGrid
            </span>
          </Link>
          <nav className="hidden items-center gap-7 rounded-full border border-line bg-white/60 px-5 py-2 text-sm font-medium md:flex">
            <Link href="#services" className="link-draw text-ink/70 hover:text-ink">
              Services
            </Link>
            <Link href="/rates" className="link-draw text-ink/70 hover:text-ink">
              Rates
            </Link>
            <Link href="#why" className="link-draw text-ink/70 hover:text-ink">
              Why us
            </Link>
            <Link href="/about" className="link-draw text-ink/70 hover:text-ink">
              Trust
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="px-2.5 sm:px-3">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="px-2.5 sm:px-3">
                <span className="sm:hidden">Sign up</span>
                <span className="hidden sm:inline">Create account</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="overflow-hidden">
        {/* ── Hero ── */}
        <section className="relative border-b border-line bg-[radial-gradient(circle_at_88%_0%,rgba(242,166,61,.18),transparent_28%),radial-gradient(circle_at_0%_70%,rgba(22,134,83,.1),transparent_32%),linear-gradient(180deg,#f8f6f0_0%,#efebe1_100%)]">
          <div
            className="pointer-events-none absolute -right-20 top-16 h-80 w-80 rounded-full bg-amber/10 blur-3xl"
            aria-hidden
          />
          <div className="mx-auto grid max-w-7xl items-start gap-8 px-3 py-10 sm:px-4 sm:py-14 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-8 lg:py-16">
            <div className="min-w-0 lg:col-span-6 xl:col-span-7">
              <HeroEnter delay={0}>
                <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.2em] text-green">
                  DataGrid · Nigeria
                </p>
                <h1 className="font-display mt-3 text-[clamp(2.6rem,8vw,4.85rem)] leading-[0.92] tracking-tight text-ink">
                  Data in ten
                  <br />
                  seconds.{" "}
                  <span className="text-green">Light in twenty.</span>
                </h1>
              </HeroEnter>

              <HeroEnter delay={90}>
                <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink/65 sm:text-lg">
                  The premium way to buy data, airtime, electricity tokens, cable
                  TV and exam pins — wallet checkout, clear order status, and
                  auto-refund when a provider fails.
                </p>
              </HeroEnter>

              <HeroEnter delay={150}>
                <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <Link href="/signup" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full px-7 sm:w-auto">
                      Open an account
                    </Button>
                  </Link>
                  <Link href="#services" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      variant="ghost"
                      className="w-full bg-white/60 sm:w-auto"
                    >
                      Browse services
                    </Button>
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono-num text-[9px] uppercase tracking-wide text-ink/40">
                  <span>Wallet checkout</span>
                  <span className="text-ink/20">·</span>
                  <span>Receipt on every order</span>
                  <span className="text-ink/20">·</span>
                  <span>Auto-refund</span>
                </div>
              </HeroEnter>

              <HeroEnter delay={240}>
                <div className="mt-9 grid max-w-lg grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: "Delivered", value: 412, prefix: "₦", suffix: "M" },
                    { label: "Orders", value: 96000 },
                    { label: "Uptime", static: "99.6%", accent: true },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={
                        stat.accent
                          ? "rounded-2xl bg-green-deep p-3 text-paper shadow-[0_18px_42px_-28px_rgba(10,46,34,.9)] sm:p-4"
                          : "rounded-2xl border border-line bg-white/75 p-3 shadow-sm backdrop-blur sm:p-4"
                      }
                    >
                      <p
                        className={
                          stat.accent
                            ? "font-mono-num text-[9px] tracking-widest text-amber"
                            : "font-mono-num text-[9px] tracking-widest text-ink/45"
                        }
                      >
                        {stat.label.toUpperCase()}
                      </p>
                      <p
                        className={
                          stat.accent
                            ? "font-mono-num mt-1.5 text-lg font-semibold sm:text-2xl"
                            : "font-mono-num mt-1.5 text-lg font-semibold text-ink sm:text-2xl"
                        }
                      >
                        {stat.static ?? (
                          <CountUp
                            value={stat.value!}
                            prefix={stat.prefix}
                            suffix={stat.suffix}
                          />
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </HeroEnter>

              <HeroEnter delay={300}>
                <div className="mt-6 hidden max-w-md lg:block">
                  <NetworkStatusBoard networks={data.networks} />
                </div>
              </HeroEnter>
            </div>

            <div id="buy" className="min-w-0 scroll-mt-24 lg:col-span-6 xl:col-span-5">
              <HeroEnter delay={120}>
                <ProductShowcase />
              </HeroEnter>
              <div className="mt-4 lg:hidden">
                <NetworkStatusBoard networks={data.networks} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Services ── */}
        <section id="services" className="bg-paper py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
            <Reveal>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.18em] text-green">
                    One reliable checkout
                  </p>
                  <h2 className="font-display mt-2 text-[clamp(1.85rem,5vw,3.25rem)] leading-[0.95] text-ink">
                    FIVE THINGS.
                    <br />
                    ONE GRID.
                  </h2>
                </div>
                <p className="max-w-md text-sm leading-relaxed text-ink/50 sm:text-right">
                  Everyday digital payments in one clean account — single wallet,
                  receipt trail, provider failover you never see.
                </p>
              </div>
            </Reveal>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              {[
                ["01", "Data", "SME · Gifting", "from ₦"],
                ["02", "Airtime", "All networks", "any amount"],
                ["03", "Electricity", "Instant tokens", "prepaid"],
                ["04", "Cable TV", "DStv · GOtv", "renewals"],
                ["05", "Exam pins", "WAEC · NECO", "result checks"],
              ].map(([number, title, detail, tag], index) => (
                <Reveal key={title} delay={index * 55}>
                  <Link
                    href="/signup"
                    className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-white p-4 shadow-[0_16px_40px_-32px_rgba(14,33,26,.5)] transition duration-300 hover:-translate-y-1 hover:border-green/30 hover:shadow-[0_28px_50px_-28px_rgba(14,33,26,.4)] sm:p-5"
                  >
                    <span className="font-mono-num text-[10px] font-semibold text-green/55">
                      {number}
                    </span>
                    <h3 className="mt-6 text-lg font-semibold text-ink">{title}</h3>
                    <p className="mt-1 font-mono-num text-[9px] uppercase tracking-wide text-ink/38">
                      {detail}
                    </p>
                    <span className="mt-auto pt-5 text-xs font-semibold text-green opacity-0 transition group-hover:opacity-100">
                      Get started →
                    </span>
                    <span className="pointer-events-none absolute -right-2 -top-2 font-display text-5xl text-green/[0.04] transition group-hover:text-green/[0.08]">
                      {tag[0]}
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Rate desk ── */}
        <section className="bg-[#efebe1] py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
            <Reveal>
              <p className="font-mono-num text-[11px] tracking-[0.2em] text-ink/45">
                RATE DESK
              </p>
              <h2 className="font-display mt-2 text-[clamp(1.85rem,5vw,3.25rem)] leading-[0.95] text-ink">
                PRICES ON THE GRID.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/55">
                Live catalogue samples — open an account for full plans, agent
                margins, and wallet checkout.
              </p>
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

        {/* ── Moats ── */}
        <section
          id="why"
          className="relative overflow-hidden bg-[radial-gradient(circle_at_90%_10%,rgba(242,166,61,.14),transparent_28%),linear-gradient(155deg,#123b2a,#0a2e22)] py-14 text-paper sm:py-16 lg:py-20"
        >
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
            <Reveal>
              <p className="font-mono-num text-[11px] tracking-[0.2em] text-amber">
                WHY DATAGRID
              </p>
              <h2 className="font-display mt-3 text-[clamp(1.85rem,5.5vw,3.4rem)] leading-[0.95]">
                Built for Nigeria.
                <br />
                Not a template.
              </h2>
            </Reveal>
            <ul className="moat-grid mt-8 sm:mt-12">
              {[
                ["Wallet checkout", "Fund once, buy data and bills in seconds."],
                [
                  "Network auto-detect",
                  "0803… snaps to MTN using the live prefix map.",
                ],
                ["Status board", "Live uptime dots on landing and dashboard."],
                [
                  "Provider failover",
                  "2+ VTU adapters. You never see the retry.",
                ],
                ["Scheduled top-ups", "1GB every Friday, 6pm WAT."],
                ["One-tap repeat", "Last buys as chips on the home grid."],
              ].map(([t, d], i) => (
                <Reveal key={t} delay={i * 55} as="li">
                  <div className="h-full rounded-[22px] border border-white/[0.06] bg-white/[0.06] p-5 shadow-[0_16px_40px_-32px_rgba(0,0,0,.8)] transition duration-300 hover:-translate-y-1 hover:bg-white/[0.09] sm:p-6">
                    <p className="font-mono-num text-[10px] text-amber">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-2 text-base font-semibold sm:mt-3 sm:text-lg">
                      {t}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-paper/65 sm:mt-2">
                      {d}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Trust / OAuth compact ── */}
        <section className="border-b border-line bg-paper py-12 sm:py-14">
          <div className="mx-auto max-w-4xl px-3 sm:px-4 lg:px-8">
            <Reveal>
              <div className="rounded-[24px] border border-line bg-white p-6 shadow-[0_20px_50px_-36px_rgba(14,33,26,.35)] sm:p-8">
                <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                  Trust &amp; access
                </p>
                <h2 className="font-display mt-2 text-2xl text-ink sm:text-3xl">
                  Secure by design.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink/60 sm:text-[15px]">
                  Optional{" "}
                  <strong className="font-semibold text-ink">Google sign-in</strong>{" "}
                  uses only OpenID Connect scopes{" "}
                  <code className="rounded bg-paper px-1.5 py-0.5 font-mono-num text-[11px]">
                    openid
                  </code>
                  ,{" "}
                  <code className="rounded bg-paper px-1.5 py-0.5 font-mono-num text-[11px]">
                    email
                  </code>
                  , and{" "}
                  <code className="rounded bg-paper px-1.5 py-0.5 font-mono-num text-[11px]">
                    profile
                  </code>{" "}
                  — then links to a verified Nigerian phone. We do not access
                  Gmail, Drive, or contacts.
                </p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                  <Link href="/privacy" className="text-green hover:underline">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="text-green hover:underline">
                    Terms of Service
                  </Link>
                  <Link href="/about" className="text-green hover:underline">
                    About &amp; trust
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mx-auto max-w-4xl px-3 py-14 sm:px-4 sm:py-16 lg:px-8 lg:py-20">
          <Reveal>
            <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.18em] text-green">
              Answers
            </p>
            <h2 className="font-display mt-2 text-[clamp(1.85rem,5vw,3rem)] text-ink">
              FAQ
            </h2>
          </Reveal>
          <dl className="mt-8 grid gap-3">
            {[
              [
                "Do I need an account?",
                "Yes for wallet purchases. Sign up with name, email and phone (OTP on both), set a PIN, fund your wallet, then buy.",
              ],
              [
                "How fast is delivery?",
                "Most data and airtime land in under 15 seconds via our provider router with automatic failover.",
              ],
              [
                "Can I become a reseller?",
                "Yes. Hit the lifetime volume threshold and agent tier unlocks wholesale rates plus API keys.",
              ],
              [
                "What happens when I sign in with Google?",
                "We use only your verified email, name, profile image and stable Google account ID to authenticate and link your DataGrid account. We do not access Gmail, Drive, contacts or other Google product content.",
              ],
            ].map(([q, a], i) => (
              <Reveal key={q} delay={i * 70}>
                <div className="rounded-[20px] border border-line bg-white p-5 shadow-[0_12px_32px_-30px_rgba(14,33,26,.45)] sm:p-6">
                  <dt className="text-base font-semibold text-ink">{q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ink/62 sm:text-[15px]">
                    {a}
                  </dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-line bg-green-deep text-paper">
        <div className="mx-auto grid max-w-7xl gap-8 px-3 py-10 sm:grid-cols-2 sm:gap-10 sm:px-4 sm:py-14 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo tone="inverse" className="w-14" alt="DataGrid" />
              <span className="font-display text-xl tracking-tight text-paper">
                DataGrid
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-paper/60">
              DataGrid — buy data, airtime and pay bills in Nigeria.
            </p>
          </div>
          <div>
            <p className="font-mono-num text-[10px] tracking-widest text-paper/40">
              LEGAL
            </p>
            <ul className="mt-3 space-y-2 text-sm text-paper/75">
              <li>
                <Link href="/privacy" className="hover:text-amber">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-amber">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-mono-num text-[10px] tracking-widest text-paper/40">
              COMPANY
            </p>
            <ul className="mt-3 space-y-2 text-sm text-paper/75">
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
              <li>
                <Link href="/rates" className="hover:text-amber">
                  Rates
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-mono-num text-[10px] tracking-widest text-paper/40">
              START
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/signup"
                className="text-sm font-semibold text-amber hover:underline"
              >
                Create account →
              </Link>
              <Link
                href="/login"
                className="text-sm text-paper/70 hover:text-amber"
              >
                Sign in
              </Link>
            </div>
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
