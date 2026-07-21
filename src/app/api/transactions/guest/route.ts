import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";
import { toLocalPhone, detectNetwork } from "@/lib/phone";
import { vtuRouter } from "@/lib/vtu/router";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const service = String(body.service || "DATA").toUpperCase();
  const local = toLocalPhone(String(body.phone || ""));
  if (!local) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const networkCode = body.networkCode || detectNetwork(local);
  const idempotencyKey = String(body.idempotencyKey || makeIdempotencyKey("guest"));
  const orderRef = makeOrderRef();

  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return NextResponse.json({
      orderRef: existing.orderRef,
      status: existing.status,
      id: existing.id,
    });
  }

  let amount = Number(body.amount || 0);
  let planId: string | undefined;
  let providerCode = "SIMULATOR";

  if (service === "DATA") {
    const plan = body.planId
      ? await prisma.plan.findFirst({
          where: {
            OR: [{ id: body.planId }, { providerCode: body.planId }],
            isActive: true,
          },
          include: { network: true },
        })
      : await prisma.plan.findFirst({
          where: {
            isActive: true,
            network: networkCode ? { code: String(networkCode) } : undefined,
          },
          orderBy: { retailPrice: "asc" },
          include: { network: true },
        });

    if (!plan) {
      // fallback demo pricing if DB empty
      amount = amount || 400;
    } else {
      planId = plan.id;
      amount = Number(plan.retailPrice);
    }
  } else if (service === "AIRTIME") {
    if (!amount || amount < 50 || amount > 100000) {
      return NextResponse.json(
        { error: "Airtime must be between ₦50 and ₦100,000" },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Guest checkout currently supports DATA and AIRTIME" },
      { status: 400 }
    );
  }

  const trail = [
    { at: new Date().toISOString(), status: "PENDING", note: "Order created" },
  ];

  const tx = await prisma.transaction.create({
    data: {
      guestPhone: local,
      service: service === "DATA" ? "DATA" : "AIRTIME",
      status: "PENDING",
      amount,
      phone: local,
      networkCode: networkCode ? String(networkCode) : null,
      planId: planId || null,
      idempotencyKey,
      orderRef,
      isGuest: true,
      statusTrail: JSON.stringify(trail),
    },
  });

  await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: "PROCESSING",
      statusTrail: JSON.stringify([
        ...trail,
        { at: new Date().toISOString(), status: "PROCESSING", note: "Routing to provider" },
      ]),
    },
  });

  const result =
    service === "DATA"
      ? await vtuRouter.buyData({
          network: String(networkCode || "MTN"),
          phone: local,
          planCode: planId || "DEMO",
          amount,
          idempotencyKey,
        })
      : await vtuRouter.buyAirtime({
          network: String(networkCode || "MTN"),
          phone: local,
          amount,
          idempotencyKey,
        });

  providerCode = result.providerCode;

  if (!result.success) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: "FAILED",
        failureReason: result.error,
        statusTrail: JSON.stringify([
          ...trail,
          { at: new Date().toISOString(), status: "PROCESSING", note: "Provider" },
          { at: new Date().toISOString(), status: "FAILED", note: result.error },
        ]),
      },
    });
    return NextResponse.json({ error: result.error || "Delivery failed" }, { status: 502 });
  }

  const provider = await prisma.provider.findUnique({ where: { code: providerCode } });

  const delivered = await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: "DELIVERED",
      providerId: provider?.id,
      providerRef: result.providerRef,
      deliveredAt: new Date(),
      statusTrail: JSON.stringify([
        ...trail,
        { at: new Date().toISOString(), status: "PROCESSING", note: providerCode },
        { at: new Date().toISOString(), status: "DELIVERED", note: "Success" },
      ]),
    },
  });

  return NextResponse.json({
    id: delivered.id,
    orderRef: delivered.orderRef,
    status: delivered.status,
    amount: Number(delivered.amount),
    provider: providerCode,
  });
}
