import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getSettingNumber } from "@/lib/settings";
import { isAgentRole } from "@/lib/commissions";
import { cached, CacheKeys, CacheTags, CacheTTL } from "@/lib/cache";
import { privateJson } from "@/lib/http-cache";

export async function GET() {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await cached(
    CacheKeys.referrals(session.userId),
    async () => {
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
      if (!user) return null;

      const commissions = await prisma.commission.findMany({
        where: { earnerId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      const earned = commissions.reduce((sum, commission) => {
        return sum + Number(commission.amount);
      }, 0);
      const commissionWallet = user.wallets.find((wallet) => {
        return wallet.kind === "COMMISSION";
      });
      const threshold = await getSettingNumber("agent.volume_threshold_ngn");
      const signupBonus = await getSettingNumber("referral.signup_bonus_ngn");
      const purchaseBps = await getSettingNumber("referral.purchase_pct_bps");
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      return {
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
        referrals: user.referrals.map((referral) => ({
          id: referral.id,
          phone: referral.phoneLocal,
          joinedAt: referral.createdAt,
          volume: Number(referral.lifetimeVolume),
        })),
        commissions: commissions.map((commission) => ({
          id: commission.id,
          kind: commission.kind,
          amount: Number(commission.amount),
          rateBps: commission.rateBps,
          createdAt: commission.createdAt,
        })),
      };
    },
    {
      ttl: CacheTTL.user,
      tags: [CacheTags.wallet(session.userId), CacheTags.settings],
    }
  );

  if (!data) return privateJson({ error: "Not found" }, { status: 404 });
  return privateJson(data);
}
