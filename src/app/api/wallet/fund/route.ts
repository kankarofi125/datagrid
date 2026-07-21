import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";
import { initializePaystack } from "@/lib/payments/paystack";
import { initializeFlutterwave } from "@/lib/payments/flutterwave";
import { ensureVirtualAccount } from "@/lib/payments/monnify";
import { isPaymentSimulateMode } from "@/lib/payments/simulator";
import { creditWallet } from "@/lib/wallet/service";
import { maybeSignupBonus } from "@/lib/commissions";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount || 0);
  const method = String(body.method || "monnify");
  if (!amount || amount < 100) {
    return NextResponse.json({ error: "Minimum fund is ₦100" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { virtualAccounts: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (method === "paystack") {
    const orderRef = makeOrderRef();
    const idem = makeIdempotencyKey("psk");
    const init = await initializePaystack({
      amountNaira: amount,
      email: user.email || `${user.phoneLocal.replace(/^0/, "")}@datagrid.ng`,
      userId: user.id,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/wallet`,
      reference: idem,
    });

    // Pending fund record
    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        service: "WALLET_FUND",
        status: isPaymentSimulateMode() ? "DELIVERED" : "PENDING",
        amount,
        idempotencyKey: idem,
        orderRef,
        fundingProvider: "PAYSTACK",
        fundingRef: init.reference,
        deliveredAt: isPaymentSimulateMode() ? new Date() : null,
        statusTrail: JSON.stringify([
          {
            at: new Date().toISOString(),
            status: isPaymentSimulateMode() ? "DELIVERED" : "PENDING",
            note: isPaymentSimulateMode() ? "Paystack sim credit" : "Awaiting payment",
          },
        ]),
      },
    });

    if (isPaymentSimulateMode()) {
      const balance = await creditWallet({
        userId: user.id,
        amount,
        transactionId: tx.id,
        memo: "Paystack fund (sim)",
      });
      await maybeSignupBonus({ userId: user.id, transactionId: tx.id });
      return NextResponse.json({
        simulated: true,
        authorization_url: init.authorization_url,
        reference: init.reference,
        balance,
        orderRef,
      });
    }

    return NextResponse.json({
      simulated: false,
      authorization_url: init.authorization_url,
      reference: init.reference,
      orderRef,
    });
  }

  if (method === "flutterwave") {
    const orderRef = makeOrderRef();
    const idem = makeIdempotencyKey("flw");
    const init = await initializeFlutterwave({
      amountNaira: amount,
      email: user.email || `${user.phoneLocal.replace(/^0/, "")}@datagrid.ng`,
      userId: user.id,
      phone: user.phoneLocal,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/wallet`,
    });

    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        service: "WALLET_FUND",
        status: init.simulated ? "DELIVERED" : "PENDING",
        amount,
        idempotencyKey: idem,
        orderRef,
        fundingProvider: "FLUTTERWAVE",
        fundingRef: init.reference,
        deliveredAt: init.simulated ? new Date() : null,
        statusTrail: JSON.stringify([
          {
            at: new Date().toISOString(),
            status: init.simulated ? "DELIVERED" : "PENDING",
            note: init.simulated ? "Flutterwave sim credit" : "Awaiting Flutterwave",
          },
        ]),
      },
    });

    if (init.simulated) {
      const balance = await creditWallet({
        userId: user.id,
        amount,
        transactionId: tx.id,
        memo: "Flutterwave fund (sim)",
      });
      await maybeSignupBonus({ userId: user.id, transactionId: tx.id });
      return NextResponse.json({
        simulated: true,
        authorization_url: init.authorization_url,
        reference: init.reference,
        balance,
        orderRef,
        provider: "FLUTTERWAVE",
      });
    }

    return NextResponse.json({
      simulated: false,
      authorization_url: init.authorization_url,
      reference: init.reference,
      orderRef,
      provider: "FLUTTERWAVE",
    });
  }

  // Monnify VA
  const existing = user.virtualAccounts.find((v) => v.provider === "MONNIFY" && v.isActive);
  const vaData = await ensureVirtualAccount({
    userId: user.id,
    accountName: user.name || `DG ${user.phoneLocal}`,
    existing: existing
      ? {
          accountNumber: existing.accountNumber,
          bankName: existing.bankName,
          accountName: existing.accountName,
          providerRef: existing.providerRef,
        }
      : null,
  });

  let va = existing;
  if (!va) {
    va = await prisma.virtualAccount.create({
      data: {
        userId: user.id,
        provider: "MONNIFY",
        accountNumber: vaData.accountNumber,
        bankName: vaData.bankName,
        accountName: vaData.accountName,
        providerRef: vaData.providerRef || undefined,
      },
    });
  }

  return NextResponse.json({
    virtualAccount: {
      accountNumber: va.accountNumber,
      bankName: va.bankName,
      accountName: va.accountName,
    },
    amount,
  });
}
