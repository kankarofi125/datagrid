"use client";

import { useRouter } from "next/navigation";
import { APP_NAV } from "@/components/layout/app-nav";
import { ShellSidebar } from "@/components/layout/ShellSidebar";

export function DesktopSidebar() {
  const router = useRouter();

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
      ]}
      actionLabel="Log out"
      actionCompactLabel="OUT"
      onAction={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    />
  );
}
