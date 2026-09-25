import { createHash, createHmac, timingSafeEqual } from "crypto";
import { isPaymentSimulateMode, simulateMonnifyAccount } from "./simulator";

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

export function monnifyBaseUrl() {
  const env = (process.env.MONNIFY_ENV || "").trim().toLowerCase();
  if (env === "live" || env === "production") return "https://api.monnify.com";
  const explicit = process.env.MONNIFY_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return "https://sandbox.monnify.com";
}

export function monnifyConfigured() {
  return Boolean(
    process.env.MONNIFY_API_KEY?.trim() &&
      (process.env.MONNIFY_SECRET_KEY?.trim() ||
        process.env.MONNIFY_CLIENT_SECRET?.trim()) &&
      process.env.MONNIFY_CONTRACT_CODE?.trim()
  );
}

function apiKey() {
  return process.env.MONNIFY_API_KEY?.trim() || "";
}

function secretKey() {
  return (
    process.env.MONNIFY_SECRET_KEY?.trim() ||
    process.env.MONNIFY_CLIENT_SECRET?.trim() ||
    ""
  );
}

function contractCode() {
  return process.env.MONNIFY_CONTRACT_CODE?.trim() || "";
}

async function monnifyFetch(
  path: string,
  opts: { method?: string; body?: unknown; bearer?: string } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.bearer) headers.Authorization = `Bearer ${opts.bearer}`;
  const res = await fetch(`${monnifyBaseUrl()}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function getMonnifyAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 15_000) {
    return tokenCache.token;
  }
  const key = apiKey();
  const secret = secretKey();
  if (!key || !secret) throw new Error("Monnify API key/secret missing");

  const basic = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${monnifyBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  const data = await res.json().catch(() => ({}));
  const token = data?.responseBody?.accessToken as string | undefined;
  const expiresIn = Number(data?.responseBody?.expiresIn || 3600);
  if (!res.ok || !token) {
    throw new Error(data?.responseMessage || "Monnify auth failed");
  }
  tokenCache = {
    token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 30) * 1000,
  };
  return token;
}

function digestEqual(expectedHex: string, provided: string) {
  const left = expectedHex.trim().toLowerCase();
  const right = provided.trim().toLowerCase();
  if (!left || !right || left.length !== right.length) return false;
  try {
    return timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
  } catch {
    return false;
  }
}

/** Sandbox contract. Monnify does not send monnify-signature on sandbox webhooks. */
export function monnifyIsSandbox() {
  const env = (process.env.MONNIFY_ENV || "").trim().toLowerCase();
  if (env === "live" || env === "production") return false;
  if (env === "sandbox" || env === "test") return true;
  return apiKey().startsWith("MK_TEST_");
}

/**
 * Verify Monnify webhook authenticity.
 * Production sends `monnify-signature` = HMAC-SHA512(secret, rawBody)
 * (docs also describe SHA-512(secret + rawBody)).
 * Sandbox omits the header — caller must confirm the payment with Monnify's API.
 */
export function verifyMonnifyWebhook(opts: {
  rawBody: string;
  signatureHeader: string | null;
}): "signed" | "sandbox-unsigned" | "reject" {
  const secret = secretKey();
  const provided = (opts.signatureHeader || "").trim();

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.PAYMENT_MODE === "simulate" &&
    provided === "simulate"
  ) {
    return "signed";
  }

  if (secret && provided) {
    const hmacBody = createHmac("sha512", secret)
      .update(opts.rawBody)
      .digest("hex");
    const concatBody = createHash("sha512")
      .update(secret + opts.rawBody)
      .digest("hex");
    if (digestEqual(hmacBody, provided) || digestEqual(concatBody, provided)) {
      return "signed";
    }
    return "reject";
  }

  // Sandbox notifications have no signature. Do not treat that as a live payment.
  if (!provided && monnifyIsSandbox()) return "sandbox-unsigned";

  if (process.env.NODE_ENV === "production" && !secret) {
    console.error("[monnify] secret missing; rejecting webhook");
  }
  return "reject";
}

export async function initializeMonnifyCheckout(opts: {
  amountNaira: number;
  email: string;
  name: string;
  userId: string;
  paymentReference: string;
  callbackUrl: string;
}) {
  if (!monnifyConfigured()) {
    throw new Error("Monnify is not configured");
  }
  const token = await getMonnifyAccessToken();
  const { ok, data } = await monnifyFetch(
    "/api/v1/merchant/transactions/init-transaction",
    {
      method: "POST",
      bearer: token,
      body: {
        amount: opts.amountNaira,
        customerName: opts.name || "DataGrid customer",
        customerEmail: opts.email,
        paymentReference: opts.paymentReference,
        paymentDescription: "DataGrid wallet fund",
        currencyCode: "NGN",
        contractCode: contractCode(),
        redirectUrl: opts.callbackUrl,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
        metadata: { userId: opts.userId },
      },
    }
  );
  const body = data?.responseBody || {};
  if (!ok || !data?.requestSuccessful) {
    throw new Error(data?.responseMessage || "Monnify initialize failed");
  }
  return {
    provider: "MONNIFY" as const,
    reference: String(body.paymentReference || opts.paymentReference),
    transactionReference: String(body.transactionReference || ""),
    checkoutUrl: String(body.checkoutUrl || body.authorizationUrl || ""),
    simulated: false as const,
  };
}

export async function queryMonnifyPayment(paymentReference: string) {
  const token = await getMonnifyAccessToken();
  const q = encodeURIComponent(paymentReference);
  const { ok, data } = await monnifyFetch(
    `/api/v1/merchant/transactions/query?paymentReference=${q}`,
    { bearer: token }
  );
  if (!ok || !data?.requestSuccessful) {
    return { paid: false, amount: 0, paymentStatus: "UNKNOWN" as const };
  }
  const body = data.responseBody || {};
  const status = String(body.paymentStatus || "").toUpperCase();
  return {
    paid: status === "PAID" || status === "OVERPAID" || status === "PARTIALLY_PAID",
    amount: Number(body.amountPaid || body.amount || 0),
    paymentStatus: status,
    transactionReference: String(body.transactionReference || ""),
  };
}

export async function ensureVirtualAccount(opts: {
  userId: string;
  accountName: string;
  email?: string;
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
      simulated: false as const,
    };
  }

  if (!monnifyConfigured()) {
    if (isPaymentSimulateMode()) return simulateMonnifyAccount(opts);
    throw new Error("Monnify keys missing");
  }

  const token = await getMonnifyAccessToken();
  const accountReference = `DG-${opts.userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)}`;
  const email =
    opts.email ||
    `user-${opts.userId.slice(0, 8)}@customers.datagrid-ng.com`;

  const create = await monnifyFetch("/api/v1/bank-transfer/reserved-accounts", {
    method: "POST",
    bearer: token,
    body: {
      accountReference,
      accountName: opts.accountName.slice(0, 100) || "DATAGRID USER",
      currencyCode: "NGN",
      contractCode: contractCode(),
      customerEmail: email,
      customerName: opts.accountName.slice(0, 100) || "DATAGRID USER",
      getAllAvailableBanks: true,
    },
  });

  let body = create.data?.responseBody;
  if (!create.ok || !create.data?.requestSuccessful) {
    const msg = String(create.data?.responseMessage || "");
    // Already reserved — fetch existing
    if (/already|exist/i.test(msg)) {
      const get = await monnifyFetch(
        `/api/v1/bank-transfer/reserved-accounts/${encodeURIComponent(accountReference)}`,
        { bearer: token }
      );
      if (get.ok && get.data?.requestSuccessful) {
        body = get.data.responseBody;
      } else {
        throw new Error(msg || "Monnify reserved account failed");
      }
    } else {
      throw new Error(msg || "Monnify reserved account failed");
    }
  }

  const accounts = Array.isArray(body?.accounts) ? body.accounts : [];
  const first = accounts[0] || body;
  const accountNumber = String(
    first?.accountNumber || body?.accountNumber || ""
  );
  const bankName = String(
    first?.bankName || body?.bankName || "Monnify"
  );
  if (!accountNumber) {
    throw new Error("Monnify did not return an account number");
  }

  return {
    provider: "MONNIFY" as const,
    accountNumber,
    bankName,
    accountName: String(body?.accountName || opts.accountName),
    providerRef: accountReference,
    simulated: false as const,
  };
}
