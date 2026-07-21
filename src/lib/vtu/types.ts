export type VTUResult = {
  success: boolean;
  providerRef?: string;
  token?: string;
  pin?: string;
  customerName?: string;
  raw?: unknown;
  error?: string;
  latencyMs?: number;
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
};

export type BuyTokenInput = {
  disco: string;
  meter: string;
  amount: number;
  idempotencyKey: string;
};

export type BuyCableInput = {
  biller: string;
  smartCard: string;
  packageCode: string;
  amount: number;
  idempotencyKey: string;
};

export type BuyBettingInput = {
  biller: string;
  customerId: string;
  amount: number;
  idempotencyKey: string;
};

export type BuyExamPinInput = {
  biller: string;
  quantity: number;
  amount: number;
  idempotencyKey: string;
};

export type ValidateMeterInput = { disco: string; meter: string };
export type ValidateIUCInput = { biller: string; smartCard: string };
export type ValidateBettingInput = { biller: string; customerId: string };

export interface VTUProvider {
  code: string;
  buyAirtime(input: BuyAirtimeInput): Promise<VTUResult>;
  buyData(input: BuyDataInput): Promise<VTUResult>;
  buyToken(input: BuyTokenInput): Promise<VTUResult>;
  buyCable(input: BuyCableInput): Promise<VTUResult>;
  buyBetting(input: BuyBettingInput): Promise<VTUResult>;
  buyExamPin(input: BuyExamPinInput): Promise<VTUResult>;
  validateMeter(input: ValidateMeterInput): Promise<VTUResult>;
  validateIUC(input: ValidateIUCInput): Promise<VTUResult>;
  validateBetting(input: ValidateBettingInput): Promise<VTUResult>;
  status(): Promise<{ ok: boolean; latencyMs: number }>;
}
