import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runDueSchedules } from "@/lib/schedules";

/**
 * Manual / legacy cron endpoint.
 * Prefer /api/cron/schedules (Vercel Cron GET).
 */
export async function POST(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const results = await runDueSchedules(50);
  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
