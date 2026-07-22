import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { error } = await adminGate();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(7, Number(searchParams.get("days") || 30)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [allTx, users, agents, networks, providers, recent, newUsers] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { createdAt: { gte: since } },
        select: {
          amount: true,
          cost: true,
          service: true,
          networkCode: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "AGENT" } }),
      prisma.network.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.provider.findMany({ orderBy: { priority: "asc" } }),
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          orderRef: true,
          service: true,
          status: true,
          amount: true,
          phone: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
    ]);

  const delivered = allTx.filter((t) => t.status === "DELIVERED");
  const failed = allTx.filter((t) =>
    t.status === "FAILED" || t.status === "REFUNDED"
  ).length;

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

  const byNetwork: Record<string, { count: number; gmv: number }> = {};
  for (const t of delivered) {
    const k = t.networkCode || "UNKNOWN";
    if (!byNetwork[k]) byNetwork[k] = { count: 0, gmv: 0 };
    byNetwork[k].count += 1;
    byNetwork[k].gmv += Number(t.amount);
  }

  const byStatus: Record<string, number> = {};
  for (const t of allTx) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  }

  // Daily series (fill empty days with zeros)
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const dailyMap = new Map<
    string,
    { gmv: number; orders: number; failed: number; revenue: number }
  >();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    dailyMap.set(dayKey(d), { gmv: 0, orders: 0, failed: 0, revenue: 0 });
  }
  for (const t of allTx) {
    const k = dayKey(new Date(t.createdAt));
    const row = dailyMap.get(k);
    if (!row) continue;
    if (t.status === "DELIVERED") {
      const amt = Number(t.amount);
      const c = Number(t.cost || 0);
      row.gmv += amt;
      row.orders += 1;
      row.revenue += amt - c;
    } else if (t.status === "FAILED" || t.status === "REFUNDED") {
      row.failed += 1;
    }
  }
  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date,
    label: date.slice(5), // MM-DD
    ...v,
  }));

  const successRate =
    delivered.length + failed > 0
      ? (delivered.length / (delivered.length + failed)) * 100
      : 100;

  // Previous window for sparklines / deltas
  const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);
  const prevDelivered = await prisma.transaction.findMany({
    where: {
      status: "DELIVERED",
      createdAt: { gte: prevSince, lt: since },
    },
    select: { amount: true },
  });
  const prevGmv = prevDelivered.reduce((s, t) => s + Number(t.amount), 0);
  const gmvDeltaPct =
    prevGmv > 0 ? ((gmv - prevGmv) / prevGmv) * 100 : gmv > 0 ? 100 : 0;

  return NextResponse.json({
    windowDays: days,
    gmv,
    revenue,
    cost,
    orders: delivered.length,
    failed,
    successRate,
    users,
    agents,
    newUsers,
    gmvDeltaPct,
    byService,
    byNetwork,
    byStatus,
    daily,
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
