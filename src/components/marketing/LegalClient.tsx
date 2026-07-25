import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

/**
 * Static legal document layout (no client animation).
 * Google OAuth verification requires privacy policies as accessible HTML
 * plain/rich text in the page body — not PDFs, iframes, or content that
 * only appears after JS animation.
 * @see https://support.google.com/cloud/answer/13806988
 */
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
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="DataGrid home"
          >
            <BrandLogo variant="mark" className="w-8" alt="" />
            <span className="text-base font-semibold tracking-wide text-green-deep">
              DataGrid
            </span>
          </Link>
          <nav
            className="flex items-center gap-4 text-sm text-ink/70"
            aria-label="Legal navigation"
          >
            <Link href="/" className="hover:text-green">
              Home
            </Link>
            <Link href="/privacy" className="hover:text-green">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-green">
              Terms
            </Link>
            <Link href="/support" className="hover:text-green">
              Support
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-green">
          {documentLabel}
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink/75">{summary}</p>
        <p className="mt-4 text-sm text-ink/55">
          Effective date: {effectiveDate}. Language: English. Jurisdiction:
          Nigeria. This is a public HTML document.
        </p>

        <nav
          className="mt-8 rounded-lg border border-line bg-white p-4"
          aria-label="Table of contents"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
            Contents
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink/80">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="hover:text-green">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="mt-10 space-y-10">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className={
                section.highlight
                  ? "scroll-mt-20 rounded-lg border border-green/25 bg-green/[0.04] p-5 sm:p-6"
                  : "scroll-mt-20 border-b border-line pb-10 last:border-b-0"
              }
            >
              <h2 className="text-xl font-semibold text-ink">
                <span className="mr-2 text-sm font-normal text-ink/40">
                  {index + 1}.
                </span>
                {section.title}
              </h2>
              <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink/80">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </article>

        <aside className="mt-12 rounded-lg border border-line bg-white p-5 text-sm leading-relaxed text-ink/70">
          <p>
            Questions about this document or your personal data:{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-semibold text-green underline"
            >
              {contactEmail}
            </a>
            .
          </p>
          <p className="mt-2">
            Related pages:{" "}
            <Link href="/privacy" className="underline hover:text-green">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/terms" className="underline hover:text-green">
              Terms of Service
            </Link>
            {" · "}
            <Link href="/" className="underline hover:text-green">
              Home
            </Link>
          </p>
        </aside>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8 text-sm text-ink/55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} DataGrid · Nigeria</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="hover:text-green">
              Home
            </Link>
            <Link href="/privacy" className="hover:text-green">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-green">
              Terms
            </Link>
            <Link href="/support" className="hover:text-green">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
