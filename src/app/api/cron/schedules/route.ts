import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runDueSchedules } from "@/lib/schedules";
import { publishRealtime, adminChannel } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron: process due scheduled top-ups.
 * Schedule: every 5 minutes (vercel.json)
 */
export async function GET(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const results = await runDueSchedules(50);
  const okCount = results.filter((r) => r.ok).length;

  try {
    await publishRealtime(adminChannel(), "cron:schedules", {
      processed: results.length,
      ok: okCount,
    });
  } catch {
    /* */
  }

  return NextResponse.json({
    ok: true,
    job: "schedules",
    processed: results.length,
    succeeded: okCount,
    results,
    at: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  return GET(req);
}
