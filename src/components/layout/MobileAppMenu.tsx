"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_NAV } from "@/components/layout/app-nav";
import {
  ShellMenuButton,
  ShellMobileMenuPanel,
} from "@/components/layout/ShellMobileMenu";
import { BalanceAmount } from "@/components/ui/BalanceAmount";

export function MobileAppMenu({
  balance,
  phone,
}: {
  balance: number;
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
          <div className="rounded-xl border border-line bg-green-deep/5 p-3">
            <p className="font-mono-num text-[10px] tracking-widest text-ink/45">WALLET</p>
            <BalanceAmount amount={balance} variant="card" className="mt-1 text-ink" />
            <p className="mt-0.5 truncate text-xs text-ink/55">{phone || "—"}</p>
          </div>
        }
        footer={
          <div className="flex flex-col gap-2">
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
        }
      />
    </>
  );
}
