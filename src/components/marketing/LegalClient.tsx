import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  highlight?: boolean;
};

export function LegalClient({
  documentLabel,
  title,
  summary,
  effectiveDate,
  contactEmail,
  sections,
}: {
  documentLabel: string;
  title: string;
  summary: string;
  effectiveDate: string;
  contactEmail: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 lg:px-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-ink/10 bg-white/95 px-3 shadow-[0_16px_42px_-28px_rgba(7,31,23,.55)] backdrop-blur-xl sm:px-4">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="DataGrid home"
          >
            <BrandLogo variant="mark" className="w-8" alt="" />
            <span className="font-display text-lg tracking-[0.025em] text-green-deep">
              DATAGRID
            </span>
          </Link>
          <nav
            className="flex items-center gap-1 text-[11px] font-semibold sm:gap-2 sm:text-xs"
            aria-label="Legal navigation"
          >
            <Link
              href="/privacy"
              className="rounded-lg px-2.5 py-2 text-ink/60 transition hover:bg-ink/[0.04] hover:text-green"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="rounded-lg px-2.5 py-2 text-ink/60 transition hover:bg-ink/[0.04] hover:text-green"
            >
              Terms
            </Link>
            <Link
              href="/support"
              className="hidden rounded-lg px-2.5 py-2 text-ink/60 transition hover:bg-ink/[0.04] hover:text-green sm:block"
            >
              Support
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:pt-16 lg:px-6 lg:pb-14 lg:pt-20">
          <HeroEnter delay={0}>
            <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.2em] text-green">
              {documentLabel}
            </p>
          </HeroEnter>
          <HeroEnter delay={70}>
            <h1 className="font-display mt-4 max-w-4xl text-5xl leading-[0.94] text-ink sm:text-6xl lg:text-7xl">
              {title}
            </h1>
          </HeroEnter>
          <HeroEnter delay={130}>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/62 sm:text-lg">
              {summary}
            </p>
          </HeroEnter>
          <HeroEnter delay={180}>
            <div className="mt-7 flex flex-wrap gap-2 font-mono-num text-[9px] uppercase tracking-[0.13em] text-ink/48">
              <span className="rounded-full border border-line bg-white px-3 py-1.5">
                Effective · {effectiveDate}
              </span>
              <span className="rounded-full border border-line bg-white px-3 py-1.5">
                Nigeria · English
              </span>
              <span className="rounded-full border border-green/15 bg-green/[0.055] px-3 py-1.5 text-green">
                Public document
              </span>
            </div>
          </HeroEnter>
        </section>

        <section className="border-y border-white/8 bg-green-deep text-paper">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6 sm:py-6">
            <TrustPoint index="01" text="Clear data collection and use" />
            <TrustPoint index="02" text="Google account disclosure" />
            <TrustPoint index="03" text="Access and deletion instructions" />
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-6">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-line bg-white p-4 shadow-[0_18px_44px_-36px_rgba(7,31,23,.48)]">
              <p className="font-mono-num text-[9px] uppercase tracking-[0.18em] text-ink/38">
                In this document
              </p>
              <ol className="mt-4 space-y-1">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="flex gap-2 rounded-lg px-2 py-2 text-xs leading-snug text-ink/55 transition hover:bg-green/[0.055] hover:text-green"
                    >
                      <span className="font-mono-num text-[9px] text-ink/30">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <article className="min-w-0 space-y-3">
            {sections.map((section, index) => (
              <Reveal key={section.id} delay={Math.min(index * 35, 180)}>
                <section
                  id={section.id}
                  className={
                    section.highlight
                      ? "scroll-mt-24 rounded-2xl border border-green/18 bg-green/[0.055] p-5 shadow-[0_18px_42px_-36px_rgba(7,31,23,.45)] sm:p-7"
                      : "scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-[0_18px_42px_-38px_rgba(7,31,23,.4)] sm:p-7"
                  }
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono-num text-[9px] font-semibold text-green">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink sm:text-xl">
                      {section.title}
                    </h2>
                  </div>
                  <div className="mt-4 space-y-3 text-sm leading-[1.75] text-ink/66 sm:text-[15px]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.bullets && (
                      <ul className="space-y-2.5 pl-1">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-3">
                            <span
                              className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full bg-green"
                              aria-hidden
                            />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </Reveal>
            ))}
          </article>
        </div>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div>
            <p className="font-mono-num text-[9px] uppercase tracking-[0.17em] text-ink/38">
              Privacy or legal questions
            </p>
            <a
              href={`mailto:${contactEmail}`}
              className="link-draw mt-1 inline-block text-sm font-semibold text-green"
            >
              {contactEmail}
            </a>
          </div>
          <div className="flex gap-4 text-xs text-ink/50">
            <Link href="/">Home</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/support">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrustPoint({ index, text }: { index: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono-num text-[9px] text-amber">{index}</span>
      <p className="text-xs font-medium text-paper/72 sm:text-sm">{text}</p>
    </div>
  );
}
