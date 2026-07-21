import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/wallet/service";
import { getSettingNumber } from "@/lib/settings";

/**
 * After a referred user funds wallet for the first time (or any fund),
 * pay signup bonus once to referrer.
 */
export async function maybeSignupBonus(opts: {
  userId: string;
  transactionId?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { id: true, referredById: true, createdAt: true },
  });
  if (!user?.referredById) return null;

  // Only once per referred user
  const already = await prisma.commission.findFirst({
    where: {
      earnerId: user.referredById,
      sourceUserId: user.id,
      kind: "SIGNUP_BONUS",
    },
  });
  if (already) return null;

  const bonus = await getSettingNumber("referral.signup_bonus_ngn");
  if (bonus <= 0) return null;

  const commission = await prisma.commission.create({
    data: {
      earnerId: user.referredById,
      sourceUserId: user.id,
      transactionId: opts.transactionId,
      kind: "SIGNUP_BONUS",
      amount: bonus,
    },
  });

  await creditWallet({
    userId: user.referredById,
    amount: bonus,
    kind: "COMMISSION",
    transactionId: opts.transactionId,
    memo: `Referral signup bonus`,
  });

  await prisma.notification.create({
    data: {
      userId: user.referredById,
      channel: "IN_APP",
      title: "Referral bonus",
      body: `₦${bonus.toLocaleString("en-NG")} credited to commission wallet`,
    },
  });

  return commission;
}

/**
 * Purchase commission: % of referred user's purchase for N months.
 */
export async function awardPurchaseCommission(opts: {
  buyerId: string;
  amount: number;
  transactionId: string;
}) {
  const buyer = await prisma.user.findUnique({
    where: { id: opts.buyerId },
    select: { id: true, referredById: true, createdAt: true },
  });
  if (!buyer?.referredById) return null;

  const windowMonths = await getSettingNumber("referral.window_months");
  const windowMs = windowMonths * 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - buyer.createdAt.getTime() > windowMs) return null;

  const bps = await getSettingNumber("referral.purchase_pct_bps");
  if (bps <= 0) return null;

  const amount = Math.round(((opts.amount * bps) / 10_000) * 100) / 100;
  if (amount < 0.01) return null;

  const commission = await prisma.commission.create({
    data: {
      earnerId: buyer.referredById,
      sourceUserId: buyer.id,
      transactionId: opts.transactionId,
      kind: "PURCHASE_PCT",
      amount,
      rateBps: bps,
    },
  });

  await creditWallet({
    userId: buyer.referredById,
    amount,
    kind: "COMMISSION",
    transactionId: opts.transactionId,
    memo: `Referral purchase ${bps / 100}%`,
  });

  return commission;
}

/** Bump lifetime volume and auto-promote to AGENT */
export async function trackVolumeAndMaybePromote(opts: {
  userId: string;
  amount: number;
}) {
  const user = await prisma.user.update({
    where: { id: opts.userId },
    data: { lifetimeVolume: { increment: opts.amount } },
  });

  const threshold = await getSettingNumber("agent.volume_threshold_ngn");
  const volume = Number(user.lifetimeVolume);

  if (
    volume >= threshold &&
    user.role === "USER" &&
    !user.agentSince
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "AGENT",
        agentSince: new Date(),
      },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        channel: "IN_APP",
        title: "Agent tier unlocked",
        body: `Lifetime volume ₦${volume.toLocaleString("en-NG")} — wholesale rates & API access enabled`,
      },
    });
    return { promoted: true, role: "AGENT" as const, volume };
  }

  return { promoted: false, role: user.role, volume };
}

export function isAgentRole(role: string) {
  return role === "AGENT" || role === "ADMIN" || role === "SUPER_ADMIN";
}
