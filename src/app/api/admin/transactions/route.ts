import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import type { TxStatus, TxService } from "@prisma/client";

export async function GET(req: Request) {
  const { error } = await adminGate();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status") || "";
  const service = searchParams.get("service") || "";
  const take = Math.min(100, Number(searchParams.get("take") || 40));

  const where: Record<string, unknown> = {};
  if (status) where.status = status as TxStatus;
  if (service) where.service = service as TxService;
  if (q) {
    where.OR = [
      { orderRef: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { guestPhone: { contains: q } },
    ];
  }

  const [rows, counts] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        orderRef: true,
        service: true,
        status: true,
        amount: true,
        cost: true,
        phone: true,
        networkCode: true,
        providerId: true,
        provider: { select: { code: true } },
        createdAt: true,
        userId: true,
      },
    }),
    prisma.transaction.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  return NextResponse.json({
    transactions: rows.map((t) => ({
      id: t.id,
      orderRef: t.orderRef,
      service: t.service,
      status: t.status,
      amount: Number(t.amount),
      cost: t.cost != null ? Number(t.cost) : null,
      phone: t.phone,
      networkCode: t.networkCode,
      providerCode: t.provider?.code || null,
      createdAt: t.createdAt.toISOString(),
      userId: t.userId,
    })),
    statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
  });
}
