import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { cached, CacheKeys, CacheTags, CacheTTL } from "@/lib/cache";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    redirect("/login");
  }

  // Force PIN setup before the main app (server-side, not only login UI).
  if (session.needsPinSetup) {
    redirect("/login?setup=pin");
  }

  let balance = 0;
  let phoneLocal = "";
  try {
    const shell = await cached(
      CacheKeys.appShell(session.userId),
      async () => {
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          include: { wallets: true },
        });
        // DB is source of truth if session flag was lost
        if (user && !user.pinHash) {
          return { phoneLocal: user.phoneLocal || "", balance: 0, needsPin: true as const };
        }
        return {
          phoneLocal: user?.phoneLocal || "",
          balance: Number(user?.wallets.find((w) => w.kind === "MAIN")?.balance ?? 0),
          needsPin: false as const,
        };
      },
      {
        ttl: CacheTTL.realtime,
        staleTtl: 300,
        tags: [CacheTags.wallet(session.userId)],
      }
    );
    if (shell.needsPin) {
      session.needsPinSetup = true;
      await session.save();
      redirect("/login?setup=pin");
    }
    phoneLocal = shell.phoneLocal;
    balance = shell.balance;
  } catch {
    /* db may be empty pre-seed */
  }

  return (
    <AppShell balance={balance} phone={phoneLocal}>
      {children}
    </AppShell>
  );
}
