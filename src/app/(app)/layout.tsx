import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";

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
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { wallets: true },
    });
    phoneLocal = user?.phoneLocal || "";
    balance = Number(user?.wallets.find((w) => w.kind === "MAIN")?.balance ?? 0);
  } catch {
    /* db may be empty pre-seed */
  }

  return (
    <AppShell balance={balance} phone={phoneLocal}>
      {children}
    </AppShell>
  );
}
