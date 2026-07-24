"use client";

import {
  ShellBottomNav,
  type ShellMobileTab,
} from "@/components/layout/BottomTabBar";

const ADMIN_TABS: ShellMobileTab[] = [
  { href: "/admin", label: "Command", icon: "home", exact: true },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/transactions", label: "Ledger", icon: "ledger", raised: true },
  { href: "/admin/wallets", label: "Wallets", icon: "wallet" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

export function AdminBottomTabBar() {
  return <ShellBottomNav tabs={ADMIN_TABS} ariaLabel="Admin mobile primary" />;
}
