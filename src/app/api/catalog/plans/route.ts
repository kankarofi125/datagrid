import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const network = searchParams.get("network");

  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
      ...(network
        ? { network: { code: network.toUpperCase() } }
        : {}),
    },
    include: { network: true },
    orderBy: [{ sortOrder: "asc" }, { retailPrice: "asc" }],
  });

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      sizeMb: p.sizeMb,
      validityDays: p.validityDays,
      retailPrice: Number(p.retailPrice),
      resellerPrice: Number(p.resellerPrice),
      networkCode: p.network.code,
      networkName: p.network.name,
      networkColor: p.network.color,
    })),
  });
}
