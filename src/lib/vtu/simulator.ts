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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function tokenDigits() {
  const parts: string[] = [];
  for (let i = 0; i < 5; i++) {
    parts.push(String(Math.floor(1000 + Math.random() * 9000)));
  }
  return parts.join(" ");
}

function examPin() {
  return Array.from({ length: 4 }, () =>
    String(Math.floor(1000 + Math.random() * 9000))
  ).join("-");
}

export const SimulatorProvider: VTUProvider = {
  code: "SIMULATOR",

  async buyAirtime(input: BuyAirtimeInput): Promise<VTUResult> {
    const t0 = Date.now();
    await sleep(800 + Math.random() * 900);
    return {
      success: true,
      providerRef: `SIM-AIR-${Date.now()}`,
      raw: input,
      latencyMs: Date.now() - t0,
    };
  },

  async buyData(input: BuyDataInput): Promise<VTUResult> {
    const t0 = Date.now();
    await sleep(900 + Math.random() * 900);
    return {
      success: true,
      providerRef: `SIM-DATA-${Date.now()}`,
      raw: input,
      latencyMs: Date.now() - t0,
    };
  },

  async buyToken(input: BuyTokenInput): Promise<VTUResult> {
    const t0 = Date.now();
    await sleep(1000 + Math.random() * 800);
    return {
      success: true,
      providerRef: `SIM-TKN-${Date.now()}`,
      token: tokenDigits(),
      customerName: "ADEMOLA O.",
      raw: input,
      latencyMs: Date.now() - t0,
    };
  },

  async buyCable(input: BuyCableInput): Promise<VTUResult> {
    const t0 = Date.now();
    await sleep(900 + Math.random() * 700);
    return {
      success: true,
      providerRef: `SIM-CBL-${Date.now()}`,
      customerName: "CHIKEZIE N.",
      raw: input,
      latencyMs: Date.now() - t0,
    };
  },

  async buyExamPin(input: BuyExamPinInput): Promise<VTUResult> {
    const t0 = Date.now();
    await sleep(700 + Math.random() * 600);
    return {
      success: true,
      providerRef: `SIM-PIN-${Date.now()}`,
      pin: examPin(),
      token: examPin(),
      raw: input,
      latencyMs: Date.now() - t0,
    };
  },

  async validateMeter(input: ValidateMeterInput): Promise<VTUResult> {
    const t0 = Date.now();
    await sleep(400);
    if (!/^\d{11}$/.test(input.meter.replace(/\s/g, ""))) {
      return { success: false, error: "Meter must be 11 digits", latencyMs: Date.now() - t0 };
    }
    return {
      success: true,
      customerName: "ADEMOLA OLUSEGUN",
      raw: input,
      latencyMs: Date.now() - t0,
    };
  },

  async validateIUC(input: ValidateIUCInput): Promise<VTUResult> {
    const t0 = Date.now();
    await sleep(450);
    const card = input.smartCard.replace(/\D/g, "");
    if (card.length < 10) {
      return { success: false, error: "Invalid smartcard / IUC", latencyMs: Date.now() - t0 };
    }
    return {
      success: true,
      customerName: "CHIKEZIE N.",
      raw: input,
      latencyMs: Date.now() - t0,
    };
  },

  async status() {
    const t0 = Date.now();
    await sleep(50);
    return { ok: true, latencyMs: Date.now() - t0 };
  },
};
