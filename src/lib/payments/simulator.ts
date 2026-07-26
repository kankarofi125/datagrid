import { makeOrderRef } from "@/lib/order-ref";

/**
 * Payment simulation (wallet test credits without Paystack/Monnify live keys).
 *
 * Enable with PAYMENT_MODE=simulate on Vercel until live payments are ready.
 * When live, set PAYMENT_MODE=live (or remove simulate) and add real keys.
 *
 * Security: only authenticated users can fund via /api/wallet/fund.
 * External webhooks still require real signatures (unsigned webhooks rejected).
 * Guest free VTU is disabled separately.
 */
export function isPaymentSimulateMode() {
  const mode = (process.env.PAYMENT_MODE || "").trim().toLowerCase();
  if (mode === "simulate" || mode === "sim") return true;
  if (mode === "live" || mode === "production") return false;

  // Default: simulate only when no Paystack key (local/dev convenience).
  // In production without an explicit mode, prefer live (no silent free credits
  // if keys are missing — init will error instead).
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return !process.env.PAYSTACK_SECRET_KEY?.trim();
}

/** Paystack-style initialize (simulated). */
export async function simulatePaystackInit(opts: {
  amount: number;
  email: string;
  userId: string;
  callbackUrl: string;
}) {
  if (!isPaymentSimulateMode()) {
    throw new Error("Payment simulation is not enabled (set PAYMENT_MODE=simulate)");
  }
  const reference = `PSK_SIM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    provider: "PAYSTACK" as const,
    reference,
    authorization_url: `${opts.callbackUrl}?simulate=paystack&ref=${reference}&amount=${opts.amount}&userId=${opts.userId}`,
    access_code: reference,
    simulated: true as const,
  };
}

/** Monnify reserved virtual account (simulated). */
export function simulateMonnifyAccount(opts: {
  userId: string;
  accountName: string;
}) {
  if (!isPaymentSimulateMode()) {
    throw new Error("Payment simulation is not enabled (set PAYMENT_MODE=simulate)");
  }
  const accountNumber = `8${String(Math.floor(100000000 + Math.random() * 899999999))}`;
  return {
    provider: "MONNIFY" as const,
    accountNumber,
    bankName: "Moniepoint MFB (sim)",
    accountName: opts.accountName || "DATAGRID USER",
    providerRef: `MON_${opts.userId.slice(0, 8)}_${makeOrderRef().slice(-4)}`,
    simulated: true as const,
  };
}
