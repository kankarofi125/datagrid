import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { cached, CacheKeys, CacheTags, CacheTTL, invalidate } from "@/lib/cache";
import { privateJson } from "@/lib/http-cache";

export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const data = await cached(
    CacheKeys.adminPlans(),
    async () => {
      const plans = await prisma.plan.findMany({
        include: { network: true },
        orderBy: [{ networkId: "asc" }, { sortOrder: "asc" }],
      });

      return {
        plans: plans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          type: plan.type,
          networkCode: plan.network.code,
          sizeMb: plan.sizeMb,
          validityDays: plan.validityDays,
          retailPrice: Number(plan.retailPrice),
          resellerPrice: Number(plan.resellerPrice),
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
        })),
      };
    },
    { ttl: CacheTTL.catalog, tags: [CacheTags.admin, CacheTags.catalog] }
  );

  return privateJson(data);
}

export async function PATCH(req: Request) {
  const { session, error } = await adminGate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const before = await prisma.plan.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    retailPrice?: number;
    resellerPrice?: number;
    isActive?: boolean;
    name?: string;
  } = {};
  if (body.retailPrice != null) data.retailPrice = Number(body.retailPrice);
  if (body.resellerPrice != null) data.resellerPrice = Number(body.resellerPrice);
  if (body.isActive != null) data.isActive = Boolean(body.isActive);
  if (body.name) data.name = String(body.name);

  const after = await prisma.plan.update({ where: { id }, data });
  await writeAudit({
    actorId: session!.userId,
    action: "PLAN_UPDATE",
    entityType: "Plan",
    entityId: id,
    before: {
      retailPrice: Number(before.retailPrice),
      resellerPrice: Number(before.resellerPrice),
      isActive: before.isActive,
    },
    after: {
      retailPrice: Number(after.retailPrice),
      resellerPrice: Number(after.resellerPrice),
      isActive: after.isActive,
    },
  });
  await invalidate(CacheTags.catalog, true);

  return NextResponse.json({ ok: true });
}
