"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description: string;
  brandKicker?: string;
  brandTitle?: ReactNode;
  brandBody?: string;
  /** Optional bullets under brand body (desktop left panel). */
  brandPoints?: string[];
  rail?: ReactNode;
  children: ReactNode;
  footerNote?: ReactNode;
};

/**
 * Shared mobile + desktop auth chrome (login / signup).
 */
export function AuthShell({
  title,
  description,
  brandKicker = "ACCESS CONTROL",
  brandTitle = (
    <>
      ENTER
      <br />
      THE GRID.
    </>
  ),
  brandBody = "Verified lines. Secure PINs. Optional email two-factor when you want an extra layer.",
  brandPoints,
  rail,
  children,
  footerNote,
}: Props) {
  return (
    <>
      {/* —— Mobile —— */}
      <div className="relative mx-auto w-full max-w-lg lg:hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(22,134,83,0.09),transparent_70%)]"
          aria-hidden
        />

        <div className="relative px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-5">
          <header>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center"
              aria-label="DataGrid home"
            >
              <BrandLogo priority className="w-[3.25rem]" />
            </Link>
          </header>

          <div className="mt-7">
            <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.16em] text-green">
              {brandKicker}
            </p>
            <h1 className="font-display mt-2 text-[clamp(1.85rem,7.5vw,2.35rem)] leading-[0.95] tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-2.5 max-w-[22rem] text-[14px] leading-relaxed text-ink/58">
              {description}
            </p>
          </div>

          {rail ? <div className="mt-5">{rail}</div> : null}

          <div
            className={cn(
              "mt-5 rounded-[22px] border border-line bg-white p-4 shadow-[0_18px_48px_-28px_rgba(14,33,26,0.35)] sm:p-5",
              "ring-1 ring-black/[0.02]"
            )}
          >
            {children}
          </div>

          {footerNote ? (
            <div className="mt-4 px-1">{footerNote}</div>
          ) : null}
        </div>
      </div>

      {/* —— Desktop —— */}
      <div className="mx-auto hidden min-h-[calc(100dvh-3rem)] max-w-6xl lg:grid lg:grid-cols-2 lg:overflow-hidden lg:rounded-none">
        <aside className="bg-grid bg-grid-live relative flex flex-col justify-between overflow-hidden p-10 text-paper xl:p-14">
          <div
            className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-amber/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-10 bottom-20 h-48 w-48 rounded-full bg-white/5 blur-2xl"
            aria-hidden
          />

          <Link href="/" className="relative inline-block" aria-label="DataGrid home">
            <BrandLogo
              priority
              tone="inverse"
              className="w-16 drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
            />
          </Link>

          <div className="relative max-w-md">
            <p className="font-mono-num text-[11px] tracking-[0.2em] text-amber">
              {brandKicker}
            </p>
            <h1 className="font-display mt-4 text-[3.5rem] leading-[0.92] xl:text-6xl">
              {brandTitle}
            </h1>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-paper/70">
              {brandBody}
            </p>
            {brandPoints && brandPoints.length > 0 ? (
              <ul className="mt-7 space-y-3">
                {brandPoints.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-[13px] leading-snug text-paper/80"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber/20 text-amber"
                      aria-hidden
                    >
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6.2 5 8.7 9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <p className="relative font-mono-num text-[10px] tracking-[0.14em] text-paper/40">
            DATAGRID · NIGERIA
          </p>
        </aside>

        <div className="relative flex flex-col justify-center bg-[linear-gradient(180deg,#f8f6f0_0%,#f0ebe1_100%)] px-10 py-12 xl:px-16">
          <div className="mx-auto w-full max-w-[400px]">
            <h2 className="font-display text-[2.15rem] leading-none tracking-tight text-ink xl:text-4xl">
              {title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink/58">
              {description}
            </p>
            {rail ? <div className="mt-6">{rail}</div> : null}
            <div
              className={cn(
                "mt-6 rounded-[22px] border border-line bg-white p-6 shadow-[0_24px_60px_-36px_rgba(14,33,26,0.4)]",
                "ring-1 ring-black/[0.02]"
              )}
            >
              {children}
            </div>
            {footerNote ? <div className="mt-5">{footerNote}</div> : null}
          </div>
        </div>
      </div>
    </>
  );
}

export function AuthLegalFooter({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "text-center text-[11px] leading-relaxed text-ink/42",
        className
      )}
    >
      By continuing, you agree to the{" "}
      <Link href="/terms" className="font-semibold text-green hover:underline">
        Terms of Service
      </Link>{" "}
      and acknowledge the{" "}
      <Link href="/privacy" className="font-semibold text-green hover:underline">
        Privacy Policy
      </Link>
      .
    </p>
  );
}

/** Secondary text action under primary CTA — meets 44px touch height on mobile. */
export function AuthTextAction({
  children,
  onClick,
  disabled,
  tone = "green",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "green" | "muted" | "quiet";
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "font-mono-num flex min-h-11 w-full items-center justify-center text-center text-xs tracking-wide transition-opacity disabled:opacity-40",
        tone === "green" && "text-green",
        tone === "muted" && "text-ink/50",
        tone === "quiet" && "text-ink/40",
        className
      )}
    >
      {children}
    </button>
  );
}

/** Soft status / notice banner used in auth forms. */
export function AuthNotice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3.5 py-3 text-[13px] leading-relaxed sm:text-sm",
        tone === "success" &&
          "border-green/20 bg-green/[0.06] text-green-deep",
        tone === "info" && "border-line bg-ink/[0.03] text-ink/70",
        tone === "danger" && "border-danger/20 bg-danger/[0.05] text-danger"
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
