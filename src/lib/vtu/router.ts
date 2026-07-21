import { SimulatorProvider } from "./simulator";
import { VtpassProvider } from "./vtpass";
import { ClubKonnectProvider } from "./clubkonnect";
import { prisma } from "@/lib/db";
import type { VTUProvider, VTUResult } from "./types";

const registry: Record<string, VTUProvider> = {
  SIMULATOR: SimulatorProvider,
  VTPASS: VtpassProvider,
  CLUBKONNECT: ClubKonnectProvider,
};

/** Ordered active providers from DB; always keep simulator as last hop */
export async function resolveProviderChain(): Promise<VTUProvider[]> {
  try {
    const rows = await prisma.provider.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
    });
    const chain: VTUProvider[] = [];
    for (const r of rows) {
      const p = registry[r.code];
      if (p) chain.push(p);
    }
    if (!chain.some((p) => p.code === "SIMULATOR")) {
      chain.push(SimulatorProvider);
    }
    return chain.length ? chain : [SimulatorProvider];
  } catch {
    return [VtpassProvider, ClubKonnectProvider, SimulatorProvider];
  }
}

async function withFailover(
  action: (p: VTUProvider) => Promise<VTUResult>,
  logAction: string
): Promise<VTUResult & { providerCode: string }> {
  const providers = await resolveProviderChain();
  let lastError = "All providers failed";

  for (const p of providers) {
    const t0 = Date.now();
    try {
      const result = await action(p);
      await logProvider(p.code, logAction, result.success, Date.now() - t0, result.error);
      if (result.success) return { ...result, providerCode: p.code };
      lastError = result.error || lastError;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Provider error";
      await logProvider(p.code, logAction, false, Date.now() - t0, msg);
      lastError = msg;
    }
  }
  return { success: false, error: lastError, providerCode: "NONE" };
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
  buyBetting: (input: Parameters<VTUProvider["buyBetting"]>[0]) =>
    withFailover((p) => p.buyBetting(input), "buyBetting"),
  buyExamPin: (input: Parameters<VTUProvider["buyExamPin"]>[0]) =>
    withFailover((p) => p.buyExamPin(input), "buyExamPin"),
  validateMeter: (input: Parameters<VTUProvider["validateMeter"]>[0]) =>
    withFailover((p) => p.validateMeter(input), "validateMeter"),
  validateIUC: (input: Parameters<VTUProvider["validateIUC"]>[0]) =>
    withFailover((p) => p.validateIUC(input), "validateIUC"),
  validateBetting: (input: Parameters<VTUProvider["validateBetting"]>[0]) =>
    withFailover((p) => p.validateBetting(input), "validateBetting"),
};
