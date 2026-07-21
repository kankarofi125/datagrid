import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { BillerCategory } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category")?.toUpperCase() as BillerCategory | undefined;

  const billers = await prisma.biller.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
    },
    include: {
      packages: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    billers: billers.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      category: b.category,
      validateType: b.validateType,
      packages: b.packages.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        amount: Number(p.amount),
        resellerPrice: p.resellerPrice != null ? Number(p.resellerPrice) : null,
        validityDays: p.validityDays,
      })),
    })),
  });
}
