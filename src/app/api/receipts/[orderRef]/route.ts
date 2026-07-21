import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { receiptHtml, receiptPlainText } from "@/lib/receipt";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderRef: string }> }
) {
  const { orderRef } = await params;
  const session = await getSession();
  const tx = await prisma.transaction.findUnique({ where: { orderRef } });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Allow owner, admin, or guest order lookup by exact ref
  const isAdmin = session.role === "ADMIN" || session.role === "SUPER_ADMIN";
  const isOwner = session.userId && tx.userId === session.userId;
  if (!isAdmin && !isOwner && !tx.isGuest) {
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // logged in but not owner
    if (tx.userId && tx.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let meta: { planName?: string } | null = null;
  try {
    meta = tx.meta ? JSON.parse(tx.meta) : null;
  } catch {
    meta = null;
  }

  const data = {
    orderRef: tx.orderRef,
    service: tx.service,
    status: tx.status,
    amount: Number(tx.amount),
    phone: tx.phone,
    networkCode: tx.networkCode,
    meterNumber: tx.meterNumber,
    smartCardNumber: tx.smartCardNumber,
    customerName: tx.customerName,
    token: tx.token,
    packageCode: tx.packageCode,
    deliveredAt: tx.deliveredAt,
    createdAt: tx.createdAt,
    meta,
  };

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "html";

  if (format === "txt") {
    return new NextResponse(receiptPlainText(data), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${orderRef}.txt"`,
      },
    });
  }

  return new NextResponse(receiptHtml(data), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
