import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getSettingNumber } from "@/lib/settings";
import { isAgentRole } from "@/lib/commissions";

export async function GET() {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      wallets: true,
      referrals: {
        select: {
          id: true,
          phoneLocal: true,
          createdAt: true,
          lifetimeVolume: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const commissions = await prisma.commission.findMany({
    where: { earnerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const earned = commissions.reduce((s, c) => s + Number(c.amount), 0);
  const commissionWallet = user.wallets.find((w) => w.kind === "COMMISSION");
  const threshold = await getSettingNumber("agent.volume_threshold_ngn");
  const signupBonus = await getSettingNumber("referral.signup_bonus_ngn");
  const purchaseBps = await getSettingNumber("referral.purchase_pct_bps");
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.json({
    referralCode: user.referralCode,
    link: `${base}/login?ref=${user.referralCode}`,
    role: user.role,
    isAgent: isAgentRole(user.role),
    agentSince: user.agentSince,
    lifetimeVolume: Number(user.lifetimeVolume),
    agentThreshold: threshold,
    progressPct: Math.min(100, (Number(user.lifetimeVolume) / threshold) * 100),
    commissionBalance: Number(commissionWallet?.balance ?? 0),
    totalEarned: earned,
    signupBonus,
    purchasePct: purchaseBps / 100,
    referrals: user.referrals.map((r) => ({
      id: r.id,
      phone: r.phoneLocal,
      joinedAt: r.createdAt,
      volume: Number(r.lifetimeVolume),
    })),
    commissions: commissions.map((c) => ({
      id: c.id,
      kind: c.kind,
      amount: Number(c.amount),
      rateBps: c.rateBps,
      createdAt: c.createdAt,
    })),
  });
}
