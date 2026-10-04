export type VTUResult = {
  success: boolean;
  providerRef?: string;
  token?: string;
  pin?: string;
  customerName?: string;
  raw?: unknown;
  error?: string;
  latencyMs?: number;
  /**
   * False stops chain failover (the provider may have taken the money —
   * retrying elsewhere risks a double purchase). The caller must treat the
   * outcome as final (refund + requery, never silent retry).
   * Defaults to true.
   */
  retryable?: boolean;
  /**
   * True skips provider health logging and continues the chain silently.
   * For "this provider doesn't serve that action" fallthroughs.
   */
  skipped?: boolean;
  /** Actual provider cost in Naira, when known (used for margin analytics). */
  costNgn?: number;
};

export type BuyAirtimeInput = {
  network: string;
  phone: string;
  amount: number;
  idempotencyKey: string;
};

export type BuyDataInput = {
  network: string;
  phone: string;
  planCode: string;
  amount: number;
  idempotencyKey: string;
  /**
   * Engine routing hints (used by ROUTER_DATA, ignored by the rest).
   * planType is the webapp Plan.type (SME | GIFTING | RETAIL).
   */
  sizeMb?: number;
  validityDays?: number;
  planType?: string;
  planName?: string;
};

export type BuyTokenInput = {
  disco: string;
  meter: string;
  amount: number;
  idempotencyKey: string;
  /** Recipient phone for provider receipts (VTpass mandates it). */
  phone?: string;
  meterType?: "prepaid" | "postpaid";
};

export type BuyCableInput = {
  biller: string;
  smartCard: string;
  packageCode: string;
  amount: number;
  idempotencyKey: string;
  /** Recipient phone for provider receipts (VTpass mandates it). */
  phone?: string;
};

export type BuyExamPinInput = {
  biller: string;
  quantity: number;
  amount: number;
  idempotencyKey: string;
  /** Recipient phone for provider receipts (VTpass mandates it). */
  phone?: string;
};

export type ValidateMeterInput = { disco: string; meter: string };
export type ValidateIUCInput = { biller: string; smartCard: string };

export interface VTUProvider {
  code: string;
  buyAirtime(input: BuyAirtimeInput): Promise<VTUResult>;
  buyData(input: BuyDataInput): Promise<VTUResult>;
  buyToken(input: BuyTokenInput): Promise<VTUResult>;
  buyCable(input: BuyCableInput): Promise<VTUResult>;
  buyExamPin(input: BuyExamPinInput): Promise<VTUResult>;
  validateMeter(input: ValidateMeterInput): Promise<VTUResult>;
  validateIUC(input: ValidateIUCInput): Promise<VTUResult>;
  status(): Promise<{ ok: boolean; latencyMs: number }>;
}
