import type { ShellNavItem } from "@/components/layout/shell-nav";

/** ERP navigation — shared mobile + desktop */
export const ADMIN_NAV = [
  { href: "/admin", label: "Command", mono: "01", exact: true, group: "Overview" },
  { href: "/admin/analytics", label: "Analytics", mono: "02", group: "Overview" },
  { href: "/admin/users", label: "Users", mono: "03", group: "People" },
  { href: "/admin/wallets", label: "Wallets", mono: "04", group: "People" },
  { href: "/admin/transactions", label: "Transactions", mono: "05", group: "Commerce" },
  { href: "/admin/services", label: "Services", mono: "06", group: "Commerce" },
  { href: "/admin/rates", label: "Rates & plans", mono: "07", group: "Commerce" },
  { href: "/admin/disputes", label: "Disputes", mono: "08", group: "Commerce" },
  { href: "/admin/gateways", label: "Payment gateways", mono: "09", group: "Integrations" },
  { href: "/admin/providers", label: "VTU providers", mono: "10", group: "Integrations" },
  { href: "/admin/integrations", label: "Integrations", mono: "11", group: "Integrations" },
  { href: "/admin/settings", label: "System settings", mono: "12", group: "System" },
  { href: "/admin/audit", label: "Audit log", mono: "13", group: "System" },
] satisfies readonly ShellNavItem[];
