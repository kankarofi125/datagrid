"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_NAV } from "@/components/layout/app-nav";
import {
  ShellMenuButton,
  ShellMobileMenuPanel,
} from "@/components/layout/ShellMobileMenu";

export function MobileAppMenu({
  phone,
}: {
  /** Kept for API compatibility with AppTopBar; balance is not shown in this menu. */
  balance?: number;
  phone: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ShellMenuButton
        label="Open menu — all services"
        expanded={open}
        onClick={() => setOpen(true)}
      />
      <ShellMobileMenuPanel
        open={open}
        onClose={() => setOpen(false)}
        title="ALL SERVICES"
        items={APP_NAV}
        ariaLabel="All app destinations"
        summary={
          phone ? (
            <div className="rounded-xl border border-line bg-green-deep/5 px-3 py-2.5">
              <p className="font-mono-num text-[10px] tracking-widest text-ink/45">
                SIGNED IN
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-ink">
                {phone}
              </p>
            </div>
          ) : undefined
        }
        footer={
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="font-mono-num text-[11px] tracking-wide text-ink/45"
          >
            ← MARKETING SITE
          </Link>
        }
      />
    </>
  );
}
