"use client";

import { APP_NAV } from "@/components/layout/app-nav";
import { ShellSidebar } from "@/components/layout/ShellSidebar";

export function DesktopSidebar() {
  return (
    <ShellSidebar
      items={APP_NAV}
      homeHref="/dashboard"
      brand="DATAGRID"
      subtitle="OPERATOR CONSOLE"
      ariaLabel="Desktop primary"
      footerLinks={[
        {
          href: "/support",
          label: "SUPPORT",
          compactLabel: "?",
        },
        {
          href: "/admin",
          label: "ADMIN",
          compactLabel: "A",
          accent: true,
        },
      ]}
    />
  );
}
