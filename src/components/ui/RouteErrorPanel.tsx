"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function RouteErrorPanel({
  error,
  reset,
  homeHref = "/dashboard",
  homeLabel = "Back to dashboard",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-10" role="alert">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-[22px] border border-danger/15 bg-white p-5 shadow-[0_22px_60px_-42px_rgba(72,20,25,.7)] sm:p-6"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/[0.08] text-base font-bold text-danger">
          !
        </span>
        <p className="mt-4 font-mono-num text-[9px] font-semibold uppercase tracking-[0.16em] text-danger">
          Temporary interruption
        </p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-[-0.025em] text-ink">
          This page couldn&apos;t finish loading.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">
          Your data is safe. Retry the request, or return to a stable page and continue.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono-num text-[9px] text-ink/32">
            Reference {error.digest}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={reset}
            className="pressable min-h-11 rounded-xl bg-green px-4 text-sm font-semibold text-white"
          >
            Try again
          </button>
          <Link
            href={homeHref}
            className="pressable flex min-h-11 items-center justify-center rounded-xl border border-line bg-paper px-4 text-center text-sm font-semibold text-ink/65"
          >
            {homeLabel}
          </Link>
        </div>
      </motion.section>
    </main>
  );
}
