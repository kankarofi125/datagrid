"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/buy/data", label: "Data", icon: DataIcon },
  { href: "/wallet", label: "Wallet", icon: WalletIcon, fab: true },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/settings", label: "Profile", icon: ProfileIcon },
];

export function BottomTabBar() {
  const path = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 shadow-[0_-14px_34px_-30px_rgba(14,33,26,.75)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary mobile"
    >
      <ul className="mx-auto flex min-h-[65px] max-w-lg items-end justify-between px-1.5 pt-1">
        {tabs.map((tab) => {
          const active =
            path === tab.href ||
            (tab.href !== "/dashboard" && path.startsWith(tab.href));
          if (tab.fab) {
            return (
              <li key={tab.href} className="relative -mt-5 flex flex-1 justify-center">
                <Link
                  href={tab.href}
                  className={cn(
                    "pressable flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full border-[4px] border-white bg-green-deep text-white shadow-[0_12px_24px_-10px_rgba(10,46,34,.72)]",
                    active && "ring-2 ring-amber/55 ring-offset-1 ring-offset-white"
                  )}
                  aria-label="Wallet"
                >
                  <tab.icon active />
                  <span className="font-mono-num mt-0.5 text-[8px] font-semibold tracking-wider text-amber">WALLET</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] tracking-wide",
                  active ? "text-green" : "text-ink/40"
                )}
              >
                <tab.icon active={active} />
                <span className="font-mono-num uppercase">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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
