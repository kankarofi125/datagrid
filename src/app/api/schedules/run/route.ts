import { NextResponse } from "next/server";
import { runDueSchedules } from "@/lib/schedules";

/**
 * Cron endpoint — call with header x-cron-secret or in simulate mode without secret.
 * In production set CRON_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret");
  const isDev = process.env.NODE_ENV !== "production" || process.env.PAYMENT_MODE === "simulate";

  if (secret && header !== secret && !isDev) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runDueSchedules(50);
  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}
