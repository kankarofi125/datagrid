import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const networks = await prisma.network.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({
    networks: networks.map((n) => ({
      code: n.code,
      name: n.name,
      color: n.color,
      status: n.status,
      uptimePct: Number(n.uptimePct),
      ussdBalance: n.ussdBalance,
    })),
  });
}
