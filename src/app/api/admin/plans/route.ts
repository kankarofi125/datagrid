import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const plans = await prisma.plan.findMany({
    include: { network: true },
    orderBy: [{ networkId: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      networkCode: p.network.code,
      sizeMb: p.sizeMb,
      validityDays: p.validityDays,
      retailPrice: Number(p.retailPrice),
      resellerPrice: Number(p.resellerPrice),
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    })),
  });
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

  return NextResponse.json({ ok: true });
}
