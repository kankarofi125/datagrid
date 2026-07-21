"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Analytics", exact: true },
  { href: "/admin/rates", label: "Rates" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/wallets", label: "Wallet credits" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminShell({
  children,
  phone,
}: {
  children: React.ReactNode;
  phone: string;
}) {
  const path = usePathname();

  return (
    <div className="min-h-screen bg-paper lg:flex">
      <aside className="border-b border-white/10 bg-green-deep text-paper lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="px-5 py-5">
          <Link href="/admin" className="font-display text-xl text-amber">
            DG ADMIN
          </Link>
          <p className="font-mono-num mt-1 text-[10px] tracking-widest text-paper/40">
            {phone}
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
          {NAV.map((item) => {
            const active = item.exact
              ? path === item.href
              : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2 text-sm",
                  active
                    ? "bg-white/10 text-amber"
                    : "text-paper/70 hover:bg-white/5 hover:text-paper"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 lg:block">
          <Link href="/dashboard" className="font-mono-num text-[10px] text-paper/40">
            ← OPERATOR APP
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
