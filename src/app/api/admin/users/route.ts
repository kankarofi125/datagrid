import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { cached, CacheKeys, CacheTags, CacheTTL, invalidate } from "@/lib/cache";
import { privateJson } from "@/lib/http-cache";

export async function GET(req: Request) {
  const { error } = await adminGate();
  if (error) return error;

  const q = new URL(req.url).searchParams.get("q")?.trim();
  const data = await cached(
    CacheKeys.adminUsers(q),
    async () => {
      const users = await prisma.user.findMany({
        where: q
          ? {
              OR: [
                { phoneLocal: { contains: q } },
                { phone: { contains: q } },
                { name: { contains: q } },
                { referralCode: { contains: q.toUpperCase() } },
              ],
            }
          : undefined,
        include: { wallets: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return {
        users: users.map((user) => ({
          id: user.id,
          phone: user.phoneLocal,
          name: user.name,
          role: user.role,
          kycTier: user.kycTier,
          kycStatus: user.kycStatus,
          isActive: user.isActive,
          lifetimeVolume: Number(user.lifetimeVolume),
          referralCode: user.referralCode,
          balance: Number(
            user.wallets.find((wallet) => wallet.kind === "MAIN")?.balance ?? 0
          ),
          commissionBalance: Number(
            user.wallets.find((wallet) => wallet.kind === "COMMISSION")?.balance ?? 0
          ),
          createdAt: user.createdAt,
        })),
      };
    },
    { ttl: CacheTTL.operational, tags: [CacheTags.admin] }
  );

  return privateJson(data);
}

export async function PATCH(req: Request) {
  const { session, error } = await adminGate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    role?: "USER" | "AGENT" | "ADMIN";
    isActive?: boolean;
    kycStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
    kycTier?: "T0" | "T1" | "T2" | "T3";
  } = {};

  if (body.role && ["USER", "AGENT", "ADMIN"].includes(body.role)) {
    data.role = body.role;
    if (body.role === "AGENT" && !before.agentSince) {
      // handled below
    }
  }
  if (body.isActive != null) data.isActive = Boolean(body.isActive);
  if (body.kycStatus) data.kycStatus = body.kycStatus;
  if (body.kycTier) data.kycTier = body.kycTier;

  const after = await prisma.user.update({
    where: { id },
    data: {
      ...data,
      agentSince:
        body.role === "AGENT" && !before.agentSince ? new Date() : before.agentSince,
    },
  });

  await writeAudit({
    actorId: session!.userId,
    action: "USER_UPDATE",
    entityType: "User",
    entityId: id,
    before: { role: before.role, isActive: before.isActive, kycStatus: before.kycStatus },
    after: { role: after.role, isActive: after.isActive, kycStatus: after.kycStatus },
  });
  await invalidate([
    CacheKeys.userProfile(id),
    CacheKeys.appShell(id),
    CacheKeys.dashboard(id),
  ]);

  return NextResponse.json({ ok: true });
}
