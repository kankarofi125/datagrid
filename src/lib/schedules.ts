import { prisma } from "@/lib/db";
import type { ScheduleFrequency } from "@prisma/client";

/** Compute next run in WAT (Africa/Lagos = UTC+1, no DST) */
export function computeNextRun(opts: {
  frequency: ScheduleFrequency;
  dayOfWeek?: number | null;
  hourWat: number;
  minuteWat: number;
  from?: Date;
}): Date {
  const from = opts.from || new Date();
  // WAT = UTC+1
  const watOffsetMs = 60 * 60 * 1000;
  const watNow = new Date(from.getTime() + watOffsetMs);

  const candidate = new Date(watNow);
  candidate.setUTCHours(opts.hourWat, opts.minuteWat, 0, 0);

  if (opts.frequency === "DAILY") {
    if (candidate <= watNow) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
  } else if (opts.frequency === "WEEKLY") {
    const target = opts.dayOfWeek ?? 5; // Friday default
    const current = candidate.getUTCDay();
    let add = (target - current + 7) % 7;
    if (add === 0 && candidate <= watNow) add = 7;
    candidate.setUTCDate(candidate.getUTCDate() + add);
  } else {
    // MONTHLY — same day-of-month as from, next month if past
    if (candidate <= watNow) {
      candidate.setUTCMonth(candidate.getUTCMonth() + 1);
    }
  }

  // Convert WAT wall time back to UTC instant
  return new Date(candidate.getTime() - watOffsetMs);
}

/**
 * Process due schedules. Uses a system PIN store... we don't have pin in schedule.
 * For scheduled runs we use a dedicated flag: only if user has pinHash, we need pin.
 * Approach: store encrypted pin is bad. Better: run with service role that skips PIN
 * for scheduled jobs owned by user.
 *
 * We add purchaseScheduled that skips pin but requires schedule ownership.
 */
export async function runDueSchedules(limit = 20) {
  const due = await prisma.scheduledTopUp.findMany({
    where: { isActive: true, nextRunAt: { lte: new Date() } },
    take: limit,
    orderBy: { nextRunAt: "asc" },
    include: { plan: true, user: true },
  });

  const results: { id: string; ok: boolean; error?: string; orderRef?: string }[] = [];

  for (const s of due) {
    try {
      if (!s.user.pinHash) {
        results.push({ id: s.id, ok: false, error: "User has no PIN" });
        await advanceSchedule(s);
        continue;
      }

      // Use a schedule-specific path that debits without re-asking PIN
      // We verify the schedule is active and owned — security boundary is cron secret
      const { purchaseScheduled } = await import("@/lib/transactions/purchase-scheduled");
      const result = await purchaseScheduled({
        userId: s.userId,
        service: s.service === "AIRTIME" ? "AIRTIME" : "DATA",
        phone: s.phone,
        networkCode: s.networkCode || undefined,
        planId: s.planId || undefined,
        amount: s.amount != null ? Number(s.amount) : undefined,
      });

      if (result.ok) {
        results.push({
          id: s.id,
          ok: true,
          orderRef: result.transaction.orderRef,
        });
        await prisma.notification.create({
          data: {
            userId: s.userId,
            channel: "IN_APP",
            title: "Scheduled top-up delivered",
            body: `${result.transaction.orderRef} · ${s.phone}`,
            transactionId: result.transaction.id,
          },
        });
      } else {
        results.push({ id: s.id, ok: false, error: result.error });
        await prisma.notification.create({
          data: {
            userId: s.userId,
            channel: "IN_APP",
            title: "Scheduled top-up failed",
            body: result.error || "Unknown error",
          },
        });
      }
    } catch (e) {
      results.push({
        id: s.id,
        ok: false,
        error: e instanceof Error ? e.message : "Error",
      });
    }
    await advanceSchedule(s);
  }

  return results;
}

async function advanceSchedule(s: {
  id: string;
  frequency: ScheduleFrequency;
  dayOfWeek: number | null;
  hourWat: number;
  minuteWat: number;
}) {
  const next = computeNextRun({
    frequency: s.frequency,
    dayOfWeek: s.dayOfWeek,
    hourWat: s.hourWat,
    minuteWat: s.minuteWat,
    from: new Date(Date.now() + 60_000),
  });
  await prisma.scheduledTopUp.update({
    where: { id: s.id },
    data: { lastRunAt: new Date(), nextRunAt: next },
  });
}
