import { isPaymentSimulateMode, simulatePaystackInit } from "./simulator";

const BASE = "https://api.paystack.co";

export async function initializePaystack(opts: {
  amountNaira: number;
  email: string;
  userId: string;
  callbackUrl: string;
  reference?: string;
}) {
  if (isPaymentSimulateMode()) {
    return simulatePaystackInit({
      amount: opts.amountNaira,
      email: opts.email,
      userId: opts.userId,
      callbackUrl: opts.callbackUrl,
    });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY missing");

  // Paystack amounts are in kobo
  const amountKobo = Math.round(opts.amountNaira * 100);
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountKobo,
      email: opts.email,
      callback_url: opts.callbackUrl,
      reference: opts.reference,
      metadata: { userId: opts.userId },
    }),
  });
  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message || "Paystack initialize failed");
  }
  return {
    provider: "PAYSTACK" as const,
    reference: data.data.reference as string,
    authorization_url: data.data.authorization_url as string,
    access_code: data.data.access_code as string,
  };
}

export async function verifyPaystackSignature(
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  if (isPaymentSimulateMode()) return true;
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const crypto = await import("crypto");
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}
