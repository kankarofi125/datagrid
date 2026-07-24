import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { cached, CacheKeys, CacheTags } from "@/lib/cache";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    redirect("/login");
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
        return {
          phoneLocal: user?.phoneLocal || "",
          balance: Number(user?.wallets.find((w) => w.kind === "MAIN")?.balance ?? 0),
        };
      },
      {
        ttl: 15,
        staleTtl: 300,
        tags: [CacheTags.wallet(session.userId)],
      }
    );
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
