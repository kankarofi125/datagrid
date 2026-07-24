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
import { SimulatorProvider } from "./simulator";

/**
 * VTpass adapter — uses real API when VTPASS_API_KEY + VTPASS_SECRET_KEY set,
 * otherwise delegates to simulator so failover path stays live.
 */
function configured() {
  return Boolean(process.env.VTPASS_API_KEY && process.env.VTPASS_SECRET_KEY);
}

async function vtpassRequest(
  path: string,
  body: Record<string, unknown>
): Promise<VTUResult> {
  const t0 = Date.now();
  const base = process.env.VTPASS_BASE_URL || "https://vtpass.com/api";
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.VTPASS_API_KEY || "",
        "secret-key": process.env.VTPASS_SECRET_KEY || "",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const ok =
      data.code === "000" ||
      data.response_description === "TRANSACTION SUCCESSFUL" ||
      data.content?.transactions?.status === "delivered";
    return {
      success: ok,
      providerRef: data.requestId || data.content?.transactions?.transactionId,
      token: data.purchased_code || data.token || data.Pin || undefined,
      customerName: data.customerName || data.content?.Customer_Name,
      raw: data,
      error: ok ? undefined : data.response_description || "VTpass failed",
      latencyMs: Date.now() - t0,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "VTpass network error",
      latencyMs: Date.now() - t0,
    };
  }
}

export const VtpassProvider: VTUProvider = {
  code: "VTPASS",

  async buyAirtime(input: BuyAirtimeInput) {
    if (!configured()) return SimulatorProvider.buyAirtime(input);
    return vtpassRequest("/pay", {
      serviceID: input.network.toLowerCase(),
      amount: input.amount,
      phone: input.phone,
      request_id: input.idempotencyKey,
    });
  },

  async buyData(input: BuyDataInput) {
    if (!configured()) return SimulatorProvider.buyData(input);
    return vtpassRequest("/pay", {
      serviceID: `${input.network.toLowerCase()}-data`,
      billersCode: input.phone,
      variation_code: input.planCode,
      amount: input.amount,
      phone: input.phone,
      request_id: input.idempotencyKey,
    });
  },

  async buyToken(input: BuyTokenInput) {
    if (!configured()) return SimulatorProvider.buyToken(input);
    return vtpassRequest("/pay", {
      serviceID: input.disco.toLowerCase(),
      billersCode: input.meter,
      amount: input.amount,
      request_id: input.idempotencyKey,
    });
  },

  async buyCable(input: BuyCableInput) {
    if (!configured()) return SimulatorProvider.buyCable(input);
    return vtpassRequest("/pay", {
      serviceID: input.biller.toLowerCase(),
      billersCode: input.smartCard,
      variation_code: input.packageCode,
      amount: input.amount,
      request_id: input.idempotencyKey,
    });
  },

  async buyExamPin(input: BuyExamPinInput) {
    if (!configured()) return SimulatorProvider.buyExamPin(input);
    return vtpassRequest("/pay", {
      serviceID: input.biller.toLowerCase(),
      quantity: input.quantity,
      amount: input.amount,
      request_id: input.idempotencyKey,
    });
  },

  async validateMeter(input: ValidateMeterInput) {
    if (!configured()) return SimulatorProvider.validateMeter(input);
    return vtpassRequest("/merchant-verify", {
      serviceID: input.disco.toLowerCase(),
      billersCode: input.meter,
      type: "prepaid",
    });
  },

  async validateIUC(input: ValidateIUCInput) {
    if (!configured()) return SimulatorProvider.validateIUC(input);
    return vtpassRequest("/merchant-verify", {
      serviceID: input.biller.toLowerCase(),
      billersCode: input.smartCard,
    });
  },

  async status() {
    const t0 = Date.now();
    if (!configured()) return { ok: true, latencyMs: Date.now() - t0 };
    try {
      const res = await fetch(
        `${process.env.VTPASS_BASE_URL || "https://vtpass.com/api"}/service-categories`,
        {
          headers: {
            "api-key": process.env.VTPASS_API_KEY || "",
            "public-key": process.env.VTPASS_PUBLIC_KEY || "",
          },
        }
      );
      return { ok: res.ok, latencyMs: Date.now() - t0 };
    } catch {
      return { ok: false, latencyMs: Date.now() - t0 };
    }
  },
};
