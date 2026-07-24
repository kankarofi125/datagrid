import { prisma } from "@/lib/db";
import { toKoboSafe } from "@/lib/money";
import type { Prisma, WalletKind } from "@prisma/client";
import { CacheTags, invalidate } from "@/lib/cache";

export class WalletError extends Error {
  constructor(
    message: string,
    public code: "INSUFFICIENT" | "NOT_FOUND" | "CONFLICT" | "INVALID"
  ) {
    super(message);
    this.name = "WalletError";
  }
}

export async function getMainWallet(userId: string) {
  let wallet = await prisma.wallet.findUnique({
    where: { userId_kind: { userId, kind: "MAIN" } },
  });
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId, kind: "MAIN", balance: 0 },
    });
  }
  return wallet;
}

export async function getWalletBalance(userId: string, kind: WalletKind = "MAIN") {
  const wallet = await prisma.wallet.findUnique({
    where: { userId_kind: { userId, kind } },
  });
  return Number(wallet?.balance ?? 0);
}

type TxClient = Prisma.TransactionClient;

async function invalidateWalletCache(userId: string) {
  try {
    await invalidate(CacheTags.wallet(userId), true);
  } catch {
    // Wallet writes must not fail because an optional cache is unavailable.
  }
}

async function applyLedger(
  tx: TxClient,
  opts: {
    walletId: string;
    version: number;
    direction: "CREDIT" | "DEBIT";
    amount: number;
    balanceAfter: number;
    transactionId?: string;
    memo?: string;
  }
) {
  const updated = await tx.wallet.updateMany({
    where: { id: opts.walletId, version: opts.version },
    data: {
      balance: opts.balanceAfter,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    throw new WalletError("Wallet was updated concurrently — retry", "CONFLICT");
  }
  await tx.walletLedger.create({
    data: {
      walletId: opts.walletId,
      direction: opts.direction,
      amount: opts.amount,
      balanceAfter: opts.balanceAfter,
      transactionId: opts.transactionId,
      memo: opts.memo,
    },
  });
}

/** Credit main wallet (funding, refunds) */
export async function creditWallet(opts: {
  userId: string;
  amount: number;
  transactionId?: string;
  memo?: string;
  kind?: WalletKind;
}) {
  const amount = toKoboSafe(opts.amount);
  if (amount <= 0) throw new WalletError("Amount must be positive", "INVALID");

  const balance = await prisma.$transaction(async (tx) => {
    let wallet = await tx.wallet.findUnique({
      where: {
        userId_kind: { userId: opts.userId, kind: opts.kind || "MAIN" },
      },
    });
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          userId: opts.userId,
          kind: opts.kind || "MAIN",
          balance: 0,
        },
      });
    }
    const balanceAfter = toKoboSafe(Number(wallet.balance) + amount);
    await applyLedger(tx, {
      walletId: wallet.id,
      version: wallet.version,
      direction: "CREDIT",
      amount,
      balanceAfter,
      transactionId: opts.transactionId,
      memo: opts.memo,
    });
    return balanceAfter;
  });
  await invalidateWalletCache(opts.userId);
  return balance;
}

/** Debit main wallet (purchases). Throws INSUFFICIENT if low. */
export async function debitWallet(opts: {
  userId: string;
  amount: number;
  transactionId?: string;
  memo?: string;
  kind?: WalletKind;
}) {
  const amount = toKoboSafe(opts.amount);
  if (amount <= 0) throw new WalletError("Amount must be positive", "INVALID");

  const balance = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: {
        userId_kind: { userId: opts.userId, kind: opts.kind || "MAIN" },
      },
    });
    if (!wallet) throw new WalletError("Wallet not found", "NOT_FOUND");
    const current = Number(wallet.balance);
    if (current < amount) {
      throw new WalletError(
        `Insufficient balance. Need ₦${amount.toLocaleString("en-NG")}, have ₦${current.toLocaleString("en-NG")}`,
        "INSUFFICIENT"
      );
    }
    const balanceAfter = toKoboSafe(current - amount);
    await applyLedger(tx, {
      walletId: wallet.id,
      version: wallet.version,
      direction: "DEBIT",
      amount,
      balanceAfter,
      transactionId: opts.transactionId,
      memo: opts.memo,
    });
    return balanceAfter;
  });
  await invalidateWalletCache(opts.userId);
  return balance;
}

/** Refund after failed VTU — credit back */
export async function refundToWallet(opts: {
  userId: string;
  amount: number;
  transactionId?: string;
  memo?: string;
}) {
  return creditWallet({
    ...opts,
    memo: opts.memo || "Auto-refund",
  });
}
