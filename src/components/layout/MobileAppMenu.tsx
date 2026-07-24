"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";
import { Sheet } from "@/components/ui/Sheet";
import { APP_NAV } from "@/components/layout/app-nav";

/**
 * Full app destinations for mobile — opened from AppTopBar.
 * Bottom tab bar stays unchanged.
 */
export function MobileAppMenu({
  balance,
  phone,
}: {
  balance: number;
  phone: string;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8.5 w-8.5 items-center justify-center rounded-[10px] border border-white/15 bg-black/25 text-paper"
        aria-label="Open menu — all services"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="ALL SERVICES">
        <div className="mb-4 rounded-lg border border-line bg-green-deep/5 p-3">
          <p className="font-mono-num text-[10px] tracking-widest text-ink/45">WALLET</p>
          <p className="font-mono-num mt-1 text-xl font-semibold tabular-nums text-ink">
            {formatNaira(balance)}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink/55">{phone || "—"}</p>
        </div>

        <nav aria-label="All app destinations">
          <ul className="divide-y divide-line rounded-lg border border-line">
            {APP_NAV.map((item) => {
              const active =
                path === item.href ||
                (item.href !== "/dashboard" && path.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3.5 text-sm transition",
                      active
                        ? "bg-green/10 font-semibold text-green"
                        : "text-ink hover:bg-ink/[0.03]"
                    )}
                  >
                    <span className="font-mono-num w-6 text-[10px] text-ink/35">
                      {item.mono}
                    </span>
                    <span>{item.label}</span>
                    <span className="ml-auto font-mono-num text-[10px] text-ink/30">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="font-mono-num text-[11px] tracking-wide text-green"
          >
            ADMIN PANEL →
          </Link>
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="font-mono-num text-[11px] tracking-wide text-ink/45"
          >
            ← MARKETING SITE
          </Link>
        </div>
      </Sheet>
    </>
  );
}
