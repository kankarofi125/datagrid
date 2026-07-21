import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ isLoggedIn: false });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      wallets: true,
    },
  });
  if (!user) {
    return NextResponse.json({ isLoggedIn: false });
  }
  const main = user.wallets.find((w) => w.kind === "MAIN");
  return NextResponse.json({
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
