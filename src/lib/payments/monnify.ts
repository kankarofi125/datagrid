import { createHmac, timingSafeEqual } from "crypto";
import { isPaymentSimulateMode, simulateMonnifyAccount } from "./simulator";

/**
 * Verify Monnify webhook signature (HMAC-SHA512 of raw body).
 * Fail closed in production without secret.
 */
export function verifyMonnifyWebhook(opts: {
  rawBody: string;
  signatureHeader: string | null;
  computeHash?: string | null;
}): boolean {
  const secret =
    process.env.MONNIFY_SECRET_KEY?.trim() ||
    process.env.MONNIFY_CLIENT_SECRET?.trim();

  if (process.env.NODE_ENV === "production" && !secret) {
    console.error("[monnify] secret missing; rejecting webhook");
    return false;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.PAYMENT_MODE === "simulate" &&
    opts.signatureHeader === "simulate"
  ) {
    return true;
  }

  if (!secret) return false;

  const provided = (opts.computeHash || opts.signatureHeader || "").trim();
  if (!provided) return false;

  const hmacBody = createHmac("sha512", secret)
    .update(opts.rawBody)
    .digest("hex");

  try {
    const a = Buffer.from(hmacBody, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  } catch {
    /* continue */
  }

  try {
    const a = Buffer.from(hmacBody.toUpperCase(), "utf8");
    const b = Buffer.from(provided.toUpperCase(), "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  } catch {
    /* fail */
  }

  return false;
}

export async function ensureVirtualAccount(opts: {
  userId: string;
  accountName: string;
  existing?: {
    accountNumber: string;
    bankName: string;
    accountName: string;
    providerRef: string | null;
  } | null;
}) {
  if (opts.existing) {
    return {
      provider: "MONNIFY" as const,
      accountNumber: opts.existing.accountNumber,
      bankName: opts.existing.bankName,
      accountName: opts.existing.accountName,
      providerRef: opts.existing.providerRef,
    };
  }

  if (isPaymentSimulateMode() || !process.env.MONNIFY_API_KEY) {
    return simulateMonnifyAccount(opts);
  }

  // Real Monnify reserved account would call their API with
  // MONNIFY_API_KEY / MONNIFY_SECRET_KEY / MONNIFY_CONTRACT_CODE
  return simulateMonnifyAccount(opts);
}
