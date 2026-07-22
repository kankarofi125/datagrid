import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getMainWallet } from "@/lib/wallet/service";
import { cached, CacheKeys, CacheTags } from "@/lib/cache";

export async function GET() {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId;
  const data = await cached(
    CacheKeys.wallet(userId),
    async () => {
      const wallet = await getMainWallet(userId);
      const commission = await prisma.wallet.findUnique({
        where: { userId_kind: { userId, kind: "COMMISSION" } },
      });
      const ledger = await prisma.walletLedger.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return {
        balance: Number(wallet.balance),
        commissionBalance: Number(commission?.balance ?? 0),
        currency: "NGN",
        ledger: ledger.map((l) => ({
          id: l.id,
          direction: l.direction,
          amount: Number(l.amount),
          balanceAfter: Number(l.balanceAfter),
          memo: l.memo,
          createdAt: l.createdAt,
        })),
        cachedAt: new Date().toISOString(),
      };
    },
    { ttl: 15, tags: [CacheTags.wallet(userId)] }
  );

  return NextResponse.json(data, {
    headers: { "X-Cache-Layer": "upstash" },
  });
}
