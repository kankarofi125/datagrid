import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runProviderHealthChecks } from "@/lib/provider-health";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron: probe VTU providers and write health logs.
 * Schedule: every 10 minutes (vercel.json)
 */
export async function GET(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const { checked, results } = await runProviderHealthChecks();
  const healthy = results.filter((r) => r.ok).length;

  return NextResponse.json({
    ok: true,
    job: "provider-health",
    checked,
    healthy,
    results,
    at: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  return GET(req);
}
