import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [delivered, failed, users, agents, networks, providers, recent] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { status: "DELIVERED", createdAt: { gte: since } },
        select: { amount: true, cost: true, service: true, networkCode: true },
      }),
      prisma.transaction.count({
        where: { status: { in: ["FAILED", "REFUNDED"] }, createdAt: { gte: since } },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "AGENT" } }),
      prisma.network.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.provider.findMany({ orderBy: { priority: "asc" } }),
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          orderRef: true,
          service: true,
          status: true,
          amount: true,
          phone: true,
          createdAt: true,
        },
      }),
    ]);

  const gmv = delivered.reduce((s, t) => s + Number(t.amount), 0);
  const cost = delivered.reduce((s, t) => s + Number(t.cost || 0), 0);
  const revenue = gmv - cost;
  const byService: Record<string, { count: number; gmv: number }> = {};
  for (const t of delivered) {
    const k = t.service;
    if (!byService[k]) byService[k] = { count: 0, gmv: 0 };
    byService[k].count += 1;
    byService[k].gmv += Number(t.amount);
  }

  const successRate =
    delivered.length + failed > 0
      ? (delivered.length / (delivered.length + failed)) * 100
      : 100;

  return NextResponse.json({
    windowDays: 30,
    gmv,
    revenue,
    cost,
    orders: delivered.length,
    failed,
    successRate,
    users,
    agents,
    byService,
    networks: networks.map((n) => ({
      code: n.code,
      name: n.name,
      status: n.status,
      uptimePct: Number(n.uptimePct),
    })),
    providers: providers.map((p) => ({
      code: p.code,
      name: p.name,
      role: p.role,
      priority: p.priority,
      isActive: p.isActive,
      successRate: Number(p.successRate),
    })),
    recent: recent.map((t) => ({
      orderRef: t.orderRef,
      service: t.service,
      status: t.status,
      amount: Number(t.amount),
      phone: t.phone,
      createdAt: t.createdAt,
    })),
  });
}
