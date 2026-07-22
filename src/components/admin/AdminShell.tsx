"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { ADMIN_NAV, type AdminNavItem } from "@/components/admin/admin-nav";
import { Sheet } from "@/components/ui/Sheet";

export function AdminShell({
  children,
  phone,
  username,
  name,
}: {
  children: React.ReactNode;
  phone: string;
  username?: string | null;
  name?: string | null;
}) {
  const path = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const activeLabel = useMemo(() => {
    const hit = ADMIN_NAV.find((item) =>
      item.exact ? path === item.href : path.startsWith(item.href)
    );
    return hit?.label || "ERP";
  }, [path]);

  async function logout() {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    router.push("/auth/admin");
    router.refresh();
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? path === href : path.startsWith(href);
  }

  const groups = useMemo(() => {
    const map = new Map<string, AdminNavItem[]>();
    for (const item of ADMIN_NAV) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, []);

  const navList = (
    <nav className="space-y-4" aria-label="Admin ERP">
      {groups.map(([group, items]) => (
        <div key={group}>
          <p className="font-mono-num mb-1.5 px-3 text-[9px] tracking-[0.16em] text-paper/35">
            {group.toUpperCase()}
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                      active
                        ? "bg-white/10 text-amber"
                        : "text-paper/70 hover:bg-white/5 hover:text-paper"
                    )}
                  >
                    <span className="font-mono-num w-5 text-[10px] text-paper/30">
                      {item.mono}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-grid-paper lg:flex">
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-white/10 lg:bg-green-deep lg:text-paper">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/admin" className="font-display text-xl text-amber">
            DG ERP
          </Link>
          <p className="font-mono-num mt-1 text-[10px] tracking-widest text-paper/40">
            CONTROL ROOM
          </p>
          <p className="mt-2 truncate text-xs text-paper/55">
            {name || username || phone}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-4">{navList}</div>
        <div className="space-y-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={logout}
            className="font-mono-num block text-[10px] tracking-wide text-amber/90 hover:text-amber"
          >
            SIGN OUT →
          </button>
          <Link
            href="/dashboard"
            className="font-mono-num block text-[10px] tracking-wide text-paper/40 hover:text-paper/70"
          >
            ← OPERATOR APP
          </Link>
        </div>
      </aside>

      <div className="sticky top-0 z-30 border-b border-line bg-green-deep text-paper lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/25"
            aria-label="Open ERP menu"
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
          <div className="min-w-0 text-center">
            <p className="font-display text-sm text-amber">DG ERP</p>
            <p className="truncate font-mono-num text-[9px] tracking-wide text-paper/50">
              {activeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="font-mono-num rounded-md border border-white/15 bg-black/25 px-2 py-1.5 text-[9px] tracking-wide text-paper/80"
          >
            OUT
          </button>
        </div>
      </div>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="ERP MENU.">
        <div className="rounded-xl bg-green-deep p-3 text-paper">{navList}</div>
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={logout}
            className="font-mono-num text-[11px] text-green"
          >
            SIGN OUT →
          </button>
          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="font-mono-num block text-[11px] text-ink/45"
          >
            ← OPERATOR APP
          </Link>
        </div>
      </Sheet>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-lg px-3 py-4 lg:max-w-[1400px] lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
