import { RouterDataProvider } from "./router-data";
import { prisma } from "@/lib/db";
import type { VTUProvider, VTUResult } from "./types";

/**
 * Single-stack fulfillment: every action goes through ROUTER_DATA
 * (vendored price/failover engine). Failover across wholesalers happens
 * inside the engine — this chain only logs the outcome per action.
 *
 * Unknown Provider rows (legacy codes) are ignored here; deactivate them
 * in the DB to keep the admin view clean. History (transactions, logs)
 * still resolves through their stored providerId.
 */
const registry: Record<string, VTUProvider> = {
  ROUTER_DATA: RouterDataProvider,
};

export async function resolveProviderChain(): Promise<VTUProvider[]> {
  try {
    const rows = await prisma.provider.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
    });
    const chain: VTUProvider[] = [];
    for (const r of rows) {
      const p = registry[r.code];
      if (p && !chain.some((c) => c.code === p.code)) chain.push(p);
    }
    if (!chain.length) chain.push(RouterDataProvider);
    return chain;
  } catch {
    return [RouterDataProvider];
  }
}

async function withFailover(
  action: (p: VTUProvider) => Promise<VTUResult>,
  logAction: string
): Promise<VTUResult & { providerCode: string }> {
  const providers = await resolveProviderChain();
  let lastError = "Provider failed";

  for (const p of providers) {
    const t0 = Date.now();
    try {
      const result = await action(p);
      // Provider doesn't serve this action — move on without logging noise.
      if (result.skipped) continue;
      await logProvider(p.code, logAction, result.success, Date.now() - t0, result.error);
      if (result.success) return { ...result, providerCode: p.code };
      lastError = result.error || lastError;
      // Ambiguous outcome (provider may have delivered) — stop the chain.
      // Retrying elsewhere risks a double purchase.
      if (result.retryable === false) {
        return { success: false, error: lastError, providerCode: p.code };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Provider error";
      await logProvider(p.code, logAction, false, Date.now() - t0, msg);
      lastError = msg;
    }
  }
  return { success: false, error: lastError, providerCode: providers[0]?.code ?? "NONE" };
}

async function logProvider(
  code: string,
  action: string,
  success: boolean,
  latencyMs: number,
  error?: string
) {
  try {
    const provider = await prisma.provider.findUnique({ where: { code } });
    if (!provider) return;
    await prisma.providerLog.create({
      data: {
        providerId: provider.id,
        action,
        success,
        latencyMs,
        error: error || null,
      },
    });
    // rolling success rate (simple)
    const recent = await prisma.providerLog.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { success: true },
    });
    const rate =
      recent.length === 0
        ? 100
        : (recent.filter((r) => r.success).length / recent.length) * 100;
    await prisma.provider.update({
      where: { id: provider.id },
      data: { successRate: Math.round(rate * 10) / 10, lastHealth: new Date() },
    });
  } catch {
    /* non-fatal */
  }
}

export function getVTUProviders() {
  return Object.values(registry);
}

export const vtuRouter = {
  buyAirtime: (input: Parameters<VTUProvider["buyAirtime"]>[0]) =>
    withFailover((p) => p.buyAirtime(input), "buyAirtime"),
  buyData: (input: Parameters<VTUProvider["buyData"]>[0]) =>
    withFailover((p) => p.buyData(input), "buyData"),
  buyToken: (input: Parameters<VTUProvider["buyToken"]>[0]) =>
    withFailover((p) => p.buyToken(input), "buyToken"),
  buyCable: (input: Parameters<VTUProvider["buyCable"]>[0]) =>
    withFailover((p) => p.buyCable(input), "buyCable"),
  buyExamPin: (input: Parameters<VTUProvider["buyExamPin"]>[0]) =>
    withFailover((p) => p.buyExamPin(input), "buyExamPin"),
  validateMeter: (input: Parameters<VTUProvider["validateMeter"]>[0]) =>
    withFailover((p) => p.validateMeter(input), "validateMeter"),
  validateIUC: (input: Parameters<VTUProvider["validateIUC"]>[0]) =>
    withFailover((p) => p.validateIUC(input), "validateIUC"),
};
