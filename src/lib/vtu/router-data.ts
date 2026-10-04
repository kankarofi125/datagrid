import {
  createBillsRouter,
  createRouter,
  normalizeNetwork,
  normalizeProductType,
} from "@/vendor/api-router-data/index.js";
import type {
  BillsRouter,
  BillsRouterConfig,
  DataRouter,
  Network as EngineNetwork,
  ProductType as EngineProductType,
  ProviderConfigBase,
  RouterConfig,
} from "@/vendor/api-router-data/index.js";
import type { AuthScheme } from "@/vendor/api-router-data/types.js";
import type {
  BillOrderResult,
} from "@/vendor/api-router-data/index.js";
import type {
  BuyAirtimeInput,
  BuyCableInput,
  BuyDataInput,
  BuyExamPinInput,
  BuyTokenInput,
  ValidateIUCInput,
  ValidateMeterInput,
  VTUProvider,
  VTUResult,
} from "./types";

/**
 * ROUTER_DATA — the sole fulfillment stack (vendored `api-router-data`).
 *
 * DATA goes through the price-aware multi-wholesaler router; airtime,
 * electricity, cable and exam pins go through the ordered-failover bills
 * router (VTpass → ClubKonnect). There is no other provider and no
 * simulator: a failure here is final (refund + honest error).
 *
 * Safety rules:
 * - Dormant (no credentials) → fast, explicit failure.
 * - Data/cable/exam cost above the charged amount → failure (never sell
 *   at a loss through this path).
 * - Ambiguous / still-pending engine outcome → `retryable: false` so no
 *   other provider is ever tried with the same order (double-buy risk).
 *   purchase.ts refunds and the provider ref in `raw` supports requery.
 */

const CODE = "ROUTER_DATA";

function envFlag(name: string): boolean {
  const v = (process.env[name] || "").trim().toLowerCase();
  return v === "1" || v === "true";
}

function masterEnabled(): boolean {
  const v = (process.env.ROUTER_DATA_ENABLED || "").trim().toLowerCase();
  return v !== "0" && v !== "false";
}

function providerTimeoutMs(): number {
  const raw = Number(process.env.ROUTER_DATA_TIMEOUT_MS || "15000");
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 15000;
}

/**
 * Explicit *_ENABLED flag wins; otherwise a present credential activates
 * the provider so pasting tokens is enough to go live.
 */
function providerOn(flagName: string, ...tokenEnvNames: string[]): boolean {
  if (envFlag(flagName)) return true;
  if (
    Object.prototype.hasOwnProperty.call(process.env, flagName) &&
    !envFlag(flagName)
  ) {
    return false;
  }
  return tokenEnvNames.some((k) => Boolean(process.env[k]?.trim()));
}

function msorg(
  prefix: string,
  defaultBase: string,
  tokenKey: string
): ProviderConfigBase {
  return {
    enabled: providerOn(`${prefix}_ENABLED`, tokenKey),
    baseUrl: process.env[`${prefix}_BASE_URL`]?.trim() || defaultBase,
    apiToken: process.env[tokenKey]?.trim() || undefined,
    timeoutMs: providerTimeoutMs(),
  };
}

function buildDataConfig(): RouterConfig | null {
  if (!masterEnabled()) return null;
  const providers: RouterConfig["providers"] = {
    alrahuz: msorg("ALRAHUZ", "https://alrahuzdata.com.ng", "ALRAHUZ_TOKEN"),
    gladtidings: msorg(
      "GLADTIDINGS",
      "https://www.gladtidingsdata.com",
      "GLADTIDINGS_TOKEN"
    ),
    easyaccess: {
      enabled: providerOn("EASYACCESS_ENABLED", "EASYACCESS_TOKEN"),
      baseUrl:
        process.env.EASYACCESS_BASE_URL?.trim() || "https://easyaccessapi.com.ng",
      apiToken: process.env.EASYACCESS_TOKEN?.trim() || undefined,
      authScheme:
        (process.env.EASYACCESS_AUTH?.trim().toLowerCase() as AuthScheme) ||
        "bearer",
      timeoutMs: providerTimeoutMs(),
    },
    gsubz: {
      enabled: providerOn("GSUBZ_ENABLED", "GSUBZ_API_KEY"),
      baseUrl: process.env.GSUBZ_BASE_URL?.trim() || "https://api.gsubz.com",
      apiKey: process.env.GSUBZ_API_KEY?.trim() || undefined,
      timeoutMs: providerTimeoutMs(),
    },
    peyflex: {
      enabled: providerOn("PEYFLEX_ENABLED", "PEYFLEX_TOKEN"),
      baseUrl:
        process.env.PEYFLEX_BASE_URL?.trim() || "https://client.peyflex.com.ng",
      apiToken: process.env.PEYFLEX_TOKEN?.trim() || undefined,
      timeoutMs: providerTimeoutMs(),
    },
    semz: msorg("SEMZ", "https://semzdata.com.ng", "SEMZ_TOKEN"),
    datagifting: {
      enabled: providerOn("DATAGIFTING_ENABLED", "DATAGIFTING_API_KEY"),
      baseUrl:
        process.env.DATAGIFTING_BASE_URL?.trim() || "https://v6.datagifting.com.ng",
      apiKey: process.env.DATAGIFTING_API_KEY?.trim() || undefined,
      timeoutMs: providerTimeoutMs(),
    },
  };
  if (!Object.values(providers).some((p) => p?.enabled)) return null;
  return { providers };
}

function buildBillsConfig(): BillsRouterConfig | null {
  if (!masterEnabled()) return null;
  const config: BillsRouterConfig = {
    providers: {
      vtpass: {
        enabled: providerOn(
          "VTPASS_BILLS_ENABLED",
          "VTPASS_API_KEY",
          "VTPASS_SECRET_KEY"
        ),
        baseUrl: process.env.VTPASS_BASE_URL?.trim() || "https://vtpass.com/api",
        apiKey: process.env.VTPASS_API_KEY?.trim() || undefined,
        secretKey: process.env.VTPASS_SECRET_KEY?.trim() || undefined,
        timeoutMs: providerTimeoutMs(),
      },
      clubkonnect: {
        enabled: providerOn(
          "CLUBKONNECT_BILLS_ENABLED",
          "CLUBKONNECT_USER_ID",
          "CLUBKONNECT_API_KEY"
        ),
        baseUrl:
          process.env.CLUBKONNECT_BASE_URL?.trim() ||
          "https://www.nellobytesystems.com",
        userId: process.env.CLUBKONNECT_USER_ID?.trim() || undefined,
        apiKey: process.env.CLUBKONNECT_API_KEY?.trim() || undefined,
        timeoutMs: providerTimeoutMs(),
      },
    },
  };
  const any = Object.values(config.providers).some((p) => p?.enabled);
  return any ? config : null;
}

let dataEngine: DataRouter | null = null;
let dataAttempted = false;
let billsEngine: BillsRouter | null = null;
let billsAttempted = false;

function getDataEngine(): DataRouter | null {
  if (dataAttempted) return dataEngine;
  dataAttempted = true;
  try {
    const config = buildDataConfig();
    if (!config) return null;
    dataEngine = createRouter(config);
    return dataEngine;
  } catch (e) {
    console.error("[router-data] data engine init failed", e);
    return null;
  }
}

function getBillsEngine(): BillsRouter | null {
  if (billsAttempted) return billsEngine;
  billsAttempted = true;
  try {
    const config = buildBillsConfig();
    if (!config) return null;
    billsEngine = createBillsRouter(config);
    return billsEngine;
  } catch (e) {
    console.error("[router-data] bills engine init failed", e);
    return null;
  }
}

/** Webapp network codes (MTN/GLO/AIRTEL/NINEMOBILE) → engine networks. */
function mapNetwork(code: string): EngineNetwork {
  const c = code.trim().toLowerCase();
  if (c === "ninemobile") return "9mobile";
  // normalizeNetwork throws on unknown — caller converts to a failure.
  return normalizeNetwork(c);
}

/**
 * Webapp Plan.type → engine product type. SME/GIFTING are authoritative;
 * RETAIL (and anything else) is inferred from the plan name, else unknown
 * (which simply matches nothing and fails honestly).
 */
function mapProductType(planType?: string, planName?: string): EngineProductType {
  const t = (planType || "").trim().toUpperCase();
  if (t === "SME") return "sme";
  if (t === "GIFTING") return "gifting";
  return normalizeProductType(planName || planType || undefined);
}

function fail(error: string, latencyMs: number, extra?: Partial<VTUResult>): VTUResult {
  return { success: false, error, latencyMs, ...extra };
}

/** Engine bills order → webapp result (pending stops any further retry). */
function billResult(r: BillOrderResult, amount: number, latencyMs: number): VTUResult {
  if (r.ok && r.status === "success") {
    return {
      success: true,
      providerRef: r.providerRef,
      token: r.token,
      pin: r.pins && r.pins.length ? r.pins.join(" | ") : undefined,
      customerName: r.customerName,
      costNgn: r.priceNgn ?? amount,
      latencyMs,
      raw: {
        engineProvider: r.providerId,
        attempts: r.attempts,
      },
    };
  }
  const ambiguous = r.status === "pending";
  return fail(
    ambiguous
      ? `Provider outcome unknown (${r.providerId || "?"}${r.providerRef ? ` ${r.providerRef}` : ""}) — refunded, requery before retrying`
      : r.message || "Provider failed",
    latencyMs,
    {
      retryable: !ambiguous,
      raw: {
        engineProvider: r.providerId,
        providerRef: r.providerRef,
        status: r.status,
        attempts: r.attempts,
      },
    }
  );
}

export const RouterDataProvider: VTUProvider = {
  code: CODE,

  async buyData(input: BuyDataInput): Promise<VTUResult> {
    const t0 = Date.now();
    const engine = getDataEngine();
    if (!engine) {
      return fail(
        "Data engine is not configured (no provider credentials)",
        Date.now() - t0
      );
    }

    let network: EngineNetwork;
    try {
      network = mapNetwork(input.network);
    } catch {
      return fail(
        `Data engine cannot route network "${input.network}"`,
        Date.now() - t0
      );
    }
    const productType = mapProductType(input.planType, input.planName);
    const sizeMb = Number(input.sizeMb || 0);
    const validityDays = Number(input.validityDays || 0);
    if (!Number.isFinite(sizeMb) || sizeMb <= 0 || !Number.isFinite(validityDays) || validityDays <= 0) {
      return fail(
        "Data engine needs plan sizeMb + validityDays (plan not mapped)",
        Date.now() - t0
      );
    }

    try {
      // Margin guard: never buy above what the wallet was charged.
      const quote = await engine.quote({
        network,
        size: sizeMb,
        validityDays,
        productType,
      });
      const selected = quote.selected;
      if (!selected) {
        return fail(
          quote.error || "Data engine has no eligible provider for this plan",
          Date.now() - t0
        );
      }
      if (selected.priceNgn > input.amount) {
        return fail(
          `Data engine cost ₦${selected.priceNgn} exceeds charged ₦${input.amount}`,
          Date.now() - t0
        );
      }

      const order = await engine.purchase({
        network,
        size: sizeMb,
        validityDays,
        productType,
        phone: input.phone,
        idempotencyKey: input.idempotencyKey,
      });

      if (!order.ok || order.status !== "success") {
        const ambiguous = order.status === "pending";
        return fail(
          ambiguous
            ? `Data engine outcome unknown (${order.providerId || "?"}${
                order.providerRef ? ` ${order.providerRef}` : ""
              }) — refunded, requery before retrying`
            : order.message || "Data engine purchase failed",
          Date.now() - t0,
          {
            retryable: !ambiguous,
            raw: {
              providerId: order.providerId,
              providerRef: order.providerRef,
              status: order.status,
              attempts: order.attempts,
            },
          }
        );
      }

      return {
        success: true,
        providerRef: order.providerRef,
        costNgn: order.priceNgn,
        latencyMs: Date.now() - t0,
        raw: {
          engineProvider: order.providerId,
          planCode: order.planCode,
          attempts: order.attempts,
        },
      };
    } catch (e) {
      return fail(
        e instanceof Error ? e.message : "Data engine error",
        Date.now() - t0
      );
    }
  },

  async buyAirtime(input: BuyAirtimeInput): Promise<VTUResult> {
    const t0 = Date.now();
    const bills = getBillsEngine();
    if (!bills) {
      return fail(
        "Bills engine is not configured (no provider credentials)",
        Date.now() - t0
      );
    }
    let network: EngineNetwork;
    try {
      network = mapNetwork(input.network);
    } catch {
      return fail(
        `Bills engine cannot route network "${input.network}"`,
        Date.now() - t0
      );
    }
    try {
      const order = await bills.buyAirtime({
        network,
        phone: input.phone,
        amount: input.amount,
        idempotencyKey: input.idempotencyKey,
      });
      return billResult(order, input.amount, Date.now() - t0);
    } catch (e) {
      return fail(
        e instanceof Error ? e.message : "Bills engine error",
        Date.now() - t0
      );
    }
  },

  async buyToken(input: BuyTokenInput): Promise<VTUResult> {
    const t0 = Date.now();
    const bills = getBillsEngine();
    if (!bills) {
      return fail(
        "Bills engine is not configured (no provider credentials)",
        Date.now() - t0
      );
    }
    try {
      const order = await bills.buyElectricity({
        disco: input.disco,
        meter: input.meter,
        meterType: input.meterType ?? "prepaid",
        amount: input.amount,
        phone: input.phone,
        idempotencyKey: input.idempotencyKey,
      });
      return billResult(order, input.amount, Date.now() - t0);
    } catch (e) {
      return fail(
        e instanceof Error ? e.message : "Bills engine error",
        Date.now() - t0
      );
    }
  },

  async buyCable(input: BuyCableInput): Promise<VTUResult> {
    const t0 = Date.now();
    const bills = getBillsEngine();
    if (!bills) {
      return fail(
        "Bills engine is not configured (no provider credentials)",
        Date.now() - t0
      );
    }
    try {
      const order = await bills.buyCable({
        biller: input.biller,
        smartCard: input.smartCard,
        packageCode: input.packageCode,
        amount: input.amount,
        phone: input.phone,
        idempotencyKey: input.idempotencyKey,
      });
      return billResult(order, input.amount, Date.now() - t0);
    } catch (e) {
      return fail(
        e instanceof Error ? e.message : "Bills engine error",
        Date.now() - t0
      );
    }
  },

  async buyExamPin(input: BuyExamPinInput): Promise<VTUResult> {
    const t0 = Date.now();
    const bills = getBillsEngine();
    if (!bills) {
      return fail(
        "Bills engine is not configured (no provider credentials)",
        Date.now() - t0
      );
    }
    try {
      const order = await bills.buyExamPin({
        biller: input.biller,
        quantity: input.quantity,
        amount: input.amount,
        phone: input.phone,
        idempotencyKey: input.idempotencyKey,
      });
      return billResult(order, input.amount, Date.now() - t0);
    } catch (e) {
      return fail(
        e instanceof Error ? e.message : "Bills engine error",
        Date.now() - t0
      );
    }
  },

  async validateMeter(input: ValidateMeterInput): Promise<VTUResult> {
    const t0 = Date.now();
    const bills = getBillsEngine();
    if (!bills) {
      return fail("Bills engine is not configured", Date.now() - t0);
    }
    try {
      const res = await bills.validateMeter({
        disco: input.disco,
        meter: input.meter,
      });
      if (!res.ok) return fail(res.message || "Meter validation failed", Date.now() - t0);
      return {
        success: true,
        customerName: res.customerName,
        latencyMs: Date.now() - t0,
        raw: res.raw,
      };
    } catch (e) {
      return fail(
        e instanceof Error ? e.message : "Bills engine error",
        Date.now() - t0
      );
    }
  },

  async validateIUC(input: ValidateIUCInput): Promise<VTUResult> {
    const t0 = Date.now();
    const bills = getBillsEngine();
    if (!bills) {
      return fail("Bills engine is not configured", Date.now() - t0);
    }
    try {
      const res = await bills.validateIUC({
        biller: input.biller,
        smartCard: input.smartCard,
      });
      if (!res.ok) return fail(res.message || "IUC validation failed", Date.now() - t0);
      return {
        success: true,
        customerName: res.customerName,
        latencyMs: Date.now() - t0,
        raw: res.raw,
      };
    } catch (e) {
      return fail(
        e instanceof Error ? e.message : "Bills engine error",
        Date.now() - t0
      );
    }
  },

  async status() {
    const t0 = Date.now();
    const ready = Boolean(getDataEngine() || getBillsEngine());
    return { ok: ready, latencyMs: Date.now() - t0 };
  },
};
