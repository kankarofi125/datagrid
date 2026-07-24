/** Shared app destinations — desktop sidebar + mobile more menu */
export const APP_NAV = [
  { href: "/dashboard", label: "Control home", mono: "01", group: "Overview" },
  { href: "/services", label: "All services", mono: "02", group: "Overview" },
  { href: "/analytics", label: "My analytics", mono: "03", group: "Overview" },
  { href: "/wallet", label: "Wallet", mono: "04", group: "Manage" },
  { href: "/history", label: "History", mono: "05", group: "Manage" },
  { href: "/schedules", label: "Schedules", mono: "06", group: "Manage" },
  { href: "/referrals", label: "Referrals", mono: "07", group: "Manage" },
  { href: "/agent", label: "Agent / API", mono: "08", group: "Account" },
  { href: "/settings", label: "Profile & security", mono: "09", group: "Account" },
] as const;
