import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { computeNextRun } from "@/lib/schedules";
import { toLocalPhone } from "@/lib/phone";
import type { ScheduleFrequency, TxService } from "@prisma/client";
import { cached, CacheKeys, CacheTags, CacheTTL, invalidate } from "@/lib/cache";
import { privateJson } from "@/lib/http-cache";

export async function GET() {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await cached(
    CacheKeys.schedules(session.userId),
    async () => {
      const rows = await prisma.scheduledTopUp.findMany({
        where: { userId: session.userId },
        include: { plan: true },
        orderBy: { nextRunAt: "asc" },
      });

      return {
        schedules: rows.map((schedule) => ({
          id: schedule.id,
          service: schedule.service,
          phone: schedule.phone,
          networkCode: schedule.networkCode,
          planId: schedule.planId,
          planName: schedule.plan?.name,
          amount: schedule.amount != null ? Number(schedule.amount) : null,
          frequency: schedule.frequency,
          dayOfWeek: schedule.dayOfWeek,
          hourWat: schedule.hourWat,
          minuteWat: schedule.minuteWat,
          nextRunAt: schedule.nextRunAt,
          lastRunAt: schedule.lastRunAt,
          isActive: schedule.isActive,
        })),
      };
    },
    { ttl: CacheTTL.user, tags: [CacheTags.schedules(session.userId)] }
  );

  return privateJson(data);
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const local = toLocalPhone(String(body.phone || ""));
  if (!local) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }

  const service = String(body.service || "DATA").toUpperCase() as TxService;
  if (service !== "DATA" && service !== "AIRTIME") {
    return NextResponse.json(
      { error: "Only DATA and AIRTIME schedules supported" },
      { status: 400 }
    );
  }

  const frequency = String(body.frequency || "WEEKLY").toUpperCase() as ScheduleFrequency;
  if (!["DAILY", "WEEKLY", "MONTHLY"].includes(frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }

  const hourWat = Math.min(23, Math.max(0, Number(body.hourWat ?? 18)));
  const minuteWat = Math.min(59, Math.max(0, Number(body.minuteWat ?? 0)));
  const dayOfWeek =
    body.dayOfWeek != null ? Math.min(6, Math.max(0, Number(body.dayOfWeek))) : 5;

  if (service === "DATA" && !body.planId) {
    return NextResponse.json({ error: "planId required for data schedule" }, { status: 400 });
  }
  if (service === "AIRTIME") {
    const amount = Number(body.amount || 0);
    if (amount < 50) {
      return NextResponse.json({ error: "Airtime amount min ₦50" }, { status: 400 });
    }
  }

  const nextRunAt = computeNextRun({
    frequency,
    dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : null,
    hourWat,
    minuteWat,
  });

  const row = await prisma.scheduledTopUp.create({
    data: {
      userId: session.userId,
      service,
      phone: local,
      networkCode: body.networkCode ? String(body.networkCode) : null,
      planId: body.planId ? String(body.planId) : null,
      amount: service === "AIRTIME" ? Number(body.amount) : null,
      frequency,
      dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : null,
      hourWat,
      minuteWat,
      nextRunAt,
      isActive: true,
    },
    include: { plan: true },
  });
  await invalidate(CacheTags.schedules(session.userId), true);

  return NextResponse.json({
    schedule: {
      id: row.id,
      service: row.service,
      phone: row.phone,
      planName: row.plan?.name,
      amount: row.amount != null ? Number(row.amount) : null,
      frequency: row.frequency,
      dayOfWeek: row.dayOfWeek,
      hourWat: row.hourWat,
      minuteWat: row.minuteWat,
      nextRunAt: row.nextRunAt,
      isActive: row.isActive,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.scheduledTopUp.updateMany({
    where: { id, userId: session.userId },
    data: {
      isActive: body.isActive != null ? Boolean(body.isActive) : undefined,
    },
  });
  await invalidate(CacheTags.schedules(session.userId), true);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.scheduledTopUp.deleteMany({
    where: { id, userId: session.userId },
  });
  await invalidate(CacheTags.schedules(session.userId), true);
  return NextResponse.json({ ok: true });
}
