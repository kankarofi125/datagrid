import { createHmac, timingSafeEqual } from "crypto";
import { isPaymentSimulateMode, simulatePaystackInit } from "./simulator";

const BASE = "https://api.paystack.co";

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

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

  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY missing");

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
    simulated: false as const,
  };
}

/**
 * Verify Paystack webhook HMAC.
 * External webhooks always require a real secret + valid signature.
 * Simulated funding uses /api/wallet/fund (authenticated), not unsigned webhooks.
 */
export async function verifyPaystackSignature(
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) {
    console.error("[paystack] PAYSTACK_SECRET_KEY missing; rejecting webhook");
    return false;
  }
  if (!signature) return false;

  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  return timingSafeEqualHex(hash, signature);
}
