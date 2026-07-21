import type {
  BuyAirtimeInput,
  BuyBettingInput,
  BuyCableInput,
  BuyDataInput,
  BuyExamPinInput,
  BuyTokenInput,
  ValidateBettingInput,
  ValidateIUCInput,
  ValidateMeterInput,
  VTUProvider,
  VTUResult,
} from "./types";
import { SimulatorProvider } from "./simulator";

/** ClubKonnect / similar — env: CLUBKONNECT_USER_ID, CLUBKONNECT_API_KEY */
function configured() {
  return Boolean(process.env.CLUBKONNECT_USER_ID && process.env.CLUBKONNECT_API_KEY);
}

async function ckGet(path: string, params: Record<string, string>): Promise<VTUResult> {
  const t0 = Date.now();
  const base = process.env.CLUBKONNECT_BASE_URL || "https://www.nellobytesystems.com";
  const q = new URLSearchParams({
    UserID: process.env.CLUBKONNECT_USER_ID || "",
    APIKey: process.env.CLUBKONNECT_API_KEY || "",
    ...params,
  });
  try {
    const res = await fetch(`${base}${path}?${q.toString()}`);
    const data = await res.json();
    const ok =
      data.status === "ORDER_RECEIVED" ||
      data.status === "successful" ||
      data.statuscode === "200";
    return {
      success: ok,
      providerRef: data.orderid || data.orderno || data.transactionid,
      token: data.token || data.pin || undefined,
      customerName: data.customer_name,
      raw: data,
      error: ok ? undefined : data.status || data.message || "ClubKonnect failed",
      latencyMs: Date.now() - t0,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "ClubKonnect network error",
      latencyMs: Date.now() - t0,
    };
  }
}

export const ClubKonnectProvider: VTUProvider = {
  code: "CLUBKONNECT",

  async buyAirtime(input: BuyAirtimeInput) {
    if (!configured()) return SimulatorProvider.buyAirtime(input);
    return ckGet("/APIAirtimeV1.asp", {
      MobileNetwork: input.network,
      Amount: String(input.amount),
      MobileNumber: input.phone,
      RequestID: input.idempotencyKey.slice(0, 40),
    });
  },

  async buyData(input: BuyDataInput) {
    if (!configured()) return SimulatorProvider.buyData(input);
    return ckGet("/APIDatabundleV1.asp", {
      MobileNetwork: input.network,
      DataPlan: input.planCode,
      MobileNumber: input.phone,
      RequestID: input.idempotencyKey.slice(0, 40),
    });
  },

  async buyToken(input: BuyTokenInput) {
    if (!configured()) return SimulatorProvider.buyToken(input);
    return ckGet("/APIElectricityV1.asp", {
      ElectricCompany: input.disco,
      MeterNo: input.meter,
      Amount: String(input.amount),
      RequestID: input.idempotencyKey.slice(0, 40),
    });
  },

  async buyCable(input: BuyCableInput) {
    if (!configured()) return SimulatorProvider.buyCable(input);
    return ckGet("/APICableTVV1.asp", {
      CableTV: input.biller,
      SmartCardNo: input.smartCard,
      Package: input.packageCode,
      RequestID: input.idempotencyKey.slice(0, 40),
    });
  },

  async buyBetting(input: BuyBettingInput) {
    if (!configured()) return SimulatorProvider.buyBetting(input);
    return SimulatorProvider.buyBetting(input);
  },

  async buyExamPin(input: BuyExamPinInput) {
    if (!configured()) return SimulatorProvider.buyExamPin(input);
    return SimulatorProvider.buyExamPin(input);
  },

  async validateMeter(input: ValidateMeterInput) {
    if (!configured()) return SimulatorProvider.validateMeter(input);
    return SimulatorProvider.validateMeter(input);
  },

  async validateIUC(input: ValidateIUCInput) {
    if (!configured()) return SimulatorProvider.validateIUC(input);
    return SimulatorProvider.validateIUC(input);
  },

  async validateBetting(input: ValidateBettingInput) {
    if (!configured()) return SimulatorProvider.validateBetting(input);
    return SimulatorProvider.validateBetting(input);
  },

  async status() {
    return { ok: true, latencyMs: 1 };
  },
};
