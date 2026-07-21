import { makeOrderRef } from "@/lib/order-ref";

/** Paystack-style initialize (simulated) */
export async function simulatePaystackInit(opts: {
  amount: number;
  email: string;
  userId: string;
  callbackUrl: string;
}) {
  const reference = `PSK_SIM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    provider: "PAYSTACK" as const,
    reference,
    authorization_url: `${opts.callbackUrl}?simulate=paystack&ref=${reference}&amount=${opts.amount}&userId=${opts.userId}`,
    access_code: reference,
  };
}

/** Monnify reserved virtual account (simulated) */
export function simulateMonnifyAccount(opts: {
  userId: string;
  accountName: string;
}) {
  // 10-digit pseudo account
  const accountNumber = `8${String(Math.floor(100000000 + Math.random() * 899999999))}`;
  return {
    provider: "MONNIFY" as const,
    accountNumber,
    bankName: "Moniepoint MFB (sim)",
    accountName: opts.accountName || "DATAGRID USER",
    providerRef: `MON_${opts.userId.slice(0, 8)}_${makeOrderRef().slice(-4)}`,
  };
}

export function isPaymentSimulateMode() {
  return (
    process.env.PAYMENT_MODE === "simulate" ||
    !process.env.PAYSTACK_SECRET_KEY
  );
}
