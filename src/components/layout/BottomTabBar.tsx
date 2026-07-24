"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cn } from "@/lib/cn";

export type ShellMobileTab = {
  href: string;
  label: string;
  icon: "home" | "services" | "wallet" | "history" | "profile" | "users" | "ledger" | "settings";
  raised?: boolean;
  exact?: boolean;
};

const CUSTOMER_TABS: ShellMobileTab[] = [
  { href: "/dashboard", label: "Home", icon: "home", exact: true },
  { href: "/services", label: "Services", icon: "services" },
  { href: "/wallet", label: "Wallet", icon: "wallet", raised: true },
  { href: "/history", label: "History", icon: "history" },
  { href: "/settings", label: "Profile", icon: "profile" },
];

export function BottomTabBar() {
  return <ShellBottomNav tabs={CUSTOMER_TABS} ariaLabel="Primary mobile" />;
}

export function ShellBottomNav({
  tabs,
  ariaLabel,
}: {
  tabs: readonly ShellMobileTab[];
  ariaLabel: string;
}) {
  const path = usePathname();

  return (
    <nav
      className="fixed inset-x-0 z-40 px-3 lg:hidden"
      style={{ bottom: "max(10px, env(safe-area-inset-bottom, 0px))" }}
      aria-label={ariaLabel}
    >
      <div className="relative mx-auto h-[66px] w-full max-w-[430px]">
        <div className="mobile-nav-surface" aria-hidden />
        <span className="mobile-nav-notch" aria-hidden />
        <ul className="relative z-10 flex h-full items-end justify-between px-1.5">
          {tabs.map((tab) => {
            const active = tab.exact
              ? path === tab.href
              : path === tab.href || path.startsWith(`${tab.href}/`);
            const Icon = NAV_ICONS[tab.icon];
            if (tab.raised) {
              return (
                <li key={tab.href} className="relative flex h-full flex-1 justify-center">
                  <Link
                    href={tab.href}
                    className={cn(
                      "pressable absolute -top-[30px] flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full border-[5px] border-paper bg-green-deep text-white shadow-[0_14px_28px_-10px_rgba(10,46,34,.78)] transition-transform",
                      active &&
                        "ring-2 ring-amber/60 ring-offset-1 ring-offset-paper"
                    )}
                    aria-label={tab.label}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon active />
                    <span className="font-mono-num mt-0.5 text-[8px] font-semibold tracking-[0.08em] text-amber">
                      {tab.label.toUpperCase()}
                    </span>
                    <NavPendingIndicator fab />
                  </Link>
                </li>
              );
            }
            return (
              <li key={tab.href} className="flex h-full flex-1">
                <Link
                  href={tab.href}
                  className={cn(
                    "relative flex h-full w-full flex-col items-center justify-center gap-0.5 pt-1 text-[9px] tracking-wide transition-colors",
                    active ? "text-green" : "text-ink/38"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon active={active} />
                  <span className="font-mono-num uppercase">{tab.label}</span>
                  <span
                    className={cn(
                      "absolute bottom-1.5 h-1 w-1 rounded-full transition",
                      active ? "bg-green" : "bg-transparent"
                    )}
                    aria-hidden
                  />
                  <NavPendingIndicator />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

const NAV_ICONS = {
  home: HomeIcon,
  services: DataIcon,
  wallet: WalletIcon,
  history: HistoryIcon,
  profile: ProfileIcon,
  users: UsersIcon,
  ledger: LedgerIcon,
  settings: SettingsIcon,
} satisfies Record<ShellMobileTab["icon"], ComponentType<{ active?: boolean }>>;

function NavPendingIndicator({ fab = false }: { fab?: boolean }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      className={cn(
        "absolute animate-spin rounded-full border-2",
        fab
          ? "inset-[-5px] border-amber/25 border-t-amber"
          : "bottom-1 h-2.5 w-2.5 border-green/20 border-t-green"
      )}
      aria-hidden
    />
  );
}

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke={active ? "#008751" : "currentColor"}
        strokeWidth="1.6"
      />
    </svg>
  );
}

function DataIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 19V5m7 14V9m7 10V3"
        stroke={active ? "#008751" : "currentColor"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WalletIcon({ active }: { active?: boolean }) {
  const stroke = active ? "#F2A63D" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="2" stroke={stroke} strokeWidth="1.7" />
      <path d="M15 12.5h4" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke={active ? "#008751" : "currentColor"}
        strokeWidth="1.6"
      />
      <path
        d="M12 8v4l2.5 1.5"
        stroke={active ? "#008751" : "currentColor"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProfileIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="9"
        r="3.5"
        stroke={active ? "#008751" : "currentColor"}
        strokeWidth="1.6"
      />
      <path
        d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19"
        stroke={active ? "#008751" : "currentColor"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UsersIcon({ active }: { active?: boolean }) {
  const stroke = active ? "#008751" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="3" stroke={stroke} strokeWidth="1.6" />
      <path d="M3.5 19c1.1-3 3-4.5 5.5-4.5s4.4 1.5 5.5 4.5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 7.5a2.5 2.5 0 0 1 0 5M17 15c1.7.7 2.8 2 3.5 4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LedgerIcon({ active }: { active?: boolean }) {
  const stroke = active ? "#F2A63D" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 4h14v16H5z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ active }: { active?: boolean }) {
  const stroke = active ? "#008751" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth="1.6" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
