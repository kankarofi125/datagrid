import { isPaymentSimulateMode, simulateMonnifyAccount } from "./simulator";

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

  // Real Monnify reserved account would call their API here with
  // MONNIFY_API_KEY / MONNIFY_SECRET_KEY / MONNIFY_CONTRACT_CODE
  // Fallback to sim if keys incomplete
  return simulateMonnifyAccount(opts);
}
