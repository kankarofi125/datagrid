"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { AdminBottomTabBar } from "@/components/admin/AdminBottomTabBar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import {
  FloatingDesktopHeader,
  FloatingMobileHeader,
} from "@/components/layout/ShellHeaders";
import {
  ShellMenuButton,
  ShellMobileMenuPanel,
} from "@/components/layout/ShellMobileMenu";
import { isShellNavActive } from "@/components/layout/shell-nav";
import { ShellSidebar } from "@/components/layout/ShellSidebar";
import { AdminProviders } from "@/components/providers/AppProviders";
import {
  RealtimeDot,
  useRealtimeStatus,
} from "@/components/realtime/RealtimeProvider";
import { Button } from "@/components/ui/Button";

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
  return (
    <AdminProviders>
      <AdminShellContent phone={phone} username={username} name={name}>
        {children}
      </AdminShellContent>
    </AdminProviders>
  );
}

function AdminShellContent({
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
  const { connected } = useRealtimeStatus();
  const identity = name || username || phone || "Administrator";
  const activeItem = ADMIN_NAV.find((item) => isShellNavActive(path, item));

  async function logout() {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    router.push("/auth/admin");
    router.refresh();
  }

  return (
    <div className="admin-app min-h-screen bg-paper lg:flex">
        <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:shrink-0">
          <ShellSidebar
            items={ADMIN_NAV}
            homeHref="/admin"
            brand="DG ERP"
            subtitle="CONTROL ROOM"
            identity={identity}
            ariaLabel="Admin ERP"
            actionLabel="Sign out"
            onAction={logout}
            footerLinks={[
              {
                href: "/dashboard",
                label: "OPERATOR",
                compactLabel: "OP",
                accent: true,
              },
              {
                href: "/",
                label: "WEBSITE",
                compactLabel: "WEB",
              },
            ]}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <FloatingMobileHeader
            menu={
              <ShellMenuButton
                label="Open admin menu"
                expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
              />
            }
            eyebrow={
              <span className="flex items-center gap-1.5">
                <RealtimeDot />
                DG ERP · {connected ? "LIVE" : "CONNECTING"}
              </span>
            }
            detail={`${activeItem?.label || "Command"} · ${identity}`}
            trailing={
              <div className="[&_button]:h-8.5 [&_button]:w-8.5 [&_button]:rounded-[11px] [&_button]:border-white/10 [&_button]:bg-white/[0.05] [&_button]:text-paper">
                <NotificationBell />
              </div>
            }
          />

          <FloatingDesktopHeader
            kicker={
              <span className="flex items-center gap-1.5">
                <RealtimeDot />
                DATAGRID ERP · {connected ? "LIVE" : "CONNECTING"}
              </span>
            }
            title={activeItem?.label || "Command"}
            trailing={
              <>
                <span className="hidden max-w-52 truncate font-mono-num text-[9px] text-ink/42 xl:block">
                  {identity}
                </span>
                <Link
                  href="/dashboard"
                  className="hidden h-9 items-center rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink/60 transition hover:text-green xl:flex"
                >
                  Operator app
                </Link>
                <Button size="sm" variant="secondary" onClick={logout}>
                  Sign out
                </Button>
              </>
            }
          />

          <ShellMobileMenuPanel
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            title="ERP MENU"
            items={ADMIN_NAV}
            ariaLabel="Admin destinations"
            summary={
              <div className="rounded-xl bg-green-deep p-3 text-paper">
                <p className="flex items-center gap-2 font-mono-num text-[9px] tracking-[0.14em] text-amber">
                  <RealtimeDot />
                  CONTROL ROOM · {connected ? "LIVE" : "CONNECTING"}
                </p>
                <p className="mt-2 truncate text-xs text-paper/58">{identity}</p>
              </div>
            }
            footer={
              <div className="space-y-2">
                <Button fullWidth variant="amber" onClick={logout}>
                  Sign out
                </Button>
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-10 items-center justify-center rounded-xl border border-line text-xs font-semibold text-ink/55"
                >
                  Return to operator app
                </Link>
              </div>
            }
          />

          <main id="main" className="min-w-0 flex-1 bg-paper pb-tabbar lg:bg-canvas lg:pb-0">
            <div className="mx-auto w-full max-w-lg px-3 py-4 lg:max-w-[1400px] lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>

        <AdminBottomTabBar />
    </div>
  );
}
