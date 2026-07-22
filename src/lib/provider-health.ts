import { prisma } from "@/lib/db";
import { SimulatorProvider } from "@/lib/vtu/simulator";
import { publishRealtime, adminChannel, publicChannel } from "@/lib/realtime";
import { invalidate, CacheTags } from "@/lib/cache";

export type ProviderHealthResult = {
  code: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
};

/**
 * Probe all active VTU providers and record health + logs.
 * Simulator always runs; others mark lastHealth with lightweight status.
 */
export async function runProviderHealthChecks(): Promise<{
  checked: number;
  results: ProviderHealthResult[];
}> {
  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    orderBy: { priority: "asc" },
  });

  const results: ProviderHealthResult[] = [];

  for (const p of providers) {
    const t0 = Date.now();
    let ok = false;
    let error: string | undefined;

    try {
      if (p.code === "SIMULATOR") {
        const status = await SimulatorProvider.status();
        ok = Boolean(status.ok);
        if (!ok) error = "simulator unhealthy";
      } else {
        // Lightweight probe — mark reachable if config exists
        // Real VTU would call provider status API here
        ok = true;
        if (p.code === "VTPASS" && !process.env.VTPASS_API_KEY && process.env.PAYMENT_MODE !== "simulate") {
          ok = false;
          error = "missing VTPASS_API_KEY";
        }
        if (
          p.code === "CLUBKONNECT" &&
          !process.env.CLUBKONNECT_API_KEY &&
          process.env.PAYMENT_MODE !== "simulate"
        ) {
          ok = false;
          error = "missing CLUBKONNECT keys";
        }
      }
    } catch (e) {
      ok = false;
      error = e instanceof Error ? e.message : "health check failed";
    }

    const latencyMs = Date.now() - t0;

    // Rolling success rate: blend toward 100 or 0
    const prev = Number(p.successRate);
    const nextRate = ok ? Math.min(100, prev * 0.9 + 10) : Math.max(0, prev * 0.9);

    await prisma.provider.update({
      where: { id: p.id },
      data: {
        lastHealth: new Date(),
        successRate: Math.round(nextRate * 10) / 10,
      },
    });

    await prisma.providerLog.create({
      data: {
        providerId: p.id,
        action: "cron_health",
        success: ok,
        latencyMs,
        error: error || null,
      },
    });

    // Soft network status if all probes fail for primary
    if (p.code === "SIMULATOR" || p.role === "PRIMARY") {
      // no-op on networks unless we want global signal
    }

    results.push({ code: p.code, ok, latencyMs, error });
  }

  try {
    await invalidate([CacheTags.admin], true);
    await publishRealtime(adminChannel(), "providers:health", {
      checked: results.length,
      results,
    });
    await publishRealtime(publicChannel(), "providers:health", {
      checked: results.length,
      ok: results.every((r) => r.ok),
    });
  } catch {
    /* non-fatal */
  }

  return { checked: results.length, results };
}
