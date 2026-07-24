import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { privateJson } from "@/lib/http-cache";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return privateJson({ isLoggedIn: false });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      wallets: true,
    },
  });
  if (!user) {
    return privateJson({ isLoggedIn: false });
  }
  const main = user.wallets.find((w) => w.kind === "MAIN");
  return privateJson({
    isLoggedIn: true,
    user: {
      id: user.id,
      phone: user.phoneLocal,
      name: user.name,
      role: user.role,
      referralCode: user.referralCode,
      balance: Number(main?.balance ?? 0),
    },
  });
}
