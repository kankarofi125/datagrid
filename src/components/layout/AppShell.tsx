"use client";

import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { DesktopTopBar } from "@/components/layout/DesktopTopBar";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { AppProviders } from "@/components/providers/AppProviders";

/**
 * Single content tree; chrome adapts:
 * - Mobile (<lg): top utility bar + bottom tabs + max-width content
 * - Desktop (lg+): deep-green sidebar + wide console top bar
 */
export function AppShell({
  balance,
  phone,
  children,
}: {
  balance: number;
  phone: string;
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <div className="customer-app min-h-screen bg-paper lg:flex">
        <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:shrink-0">
          <DesktopSidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopBar balance={balance} phone={phone} />
          <DesktopTopBar
            balance={balance}
            phone={phone}
            title="OPERATOR CONSOLE"
          />

          <main
            id="main"
            className="flex-1 bg-paper pb-tabbar lg:bg-canvas lg:pb-0"
          >
            <div className="mx-auto w-full max-w-lg lg:max-w-[1440px]">
              {children}
            </div>
          </main>
        </div>

        <BottomTabBar />
        <WhatsAppFab />
      </div>
    </AppProviders>
  );
}
