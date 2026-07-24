import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ReceiptViews } from "@/components/history/ReceiptViews";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ orderRef: string }>;
}) {
  const { orderRef } = await params;
  const session = await getSession();
  const tx = await prisma.transaction.findUnique({ where: { orderRef } });
  if (!tx) notFound();

  const isAdmin = session.role === "ADMIN" || session.role === "SUPER_ADMIN";
  const isOwner = Boolean(session.userId && tx.userId === session.userId);
  if (!tx.isGuest && !isAdmin && !isOwner) notFound();

  let trail: { at: string; status: string; note?: string }[] = [];
  let planName: string | null = null;
  try {
    trail = JSON.parse(tx.statusTrail);
  } catch {
    trail = [];
  }
  try {
    const meta = tx.meta ? JSON.parse(tx.meta) : null;
    planName = typeof meta?.planName === "string" ? meta.planName : null;
  } catch {
    planName = null;
  }

  return (
    <ReceiptViews
      tx={{
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
        planName,
        trail,
      }}
    />
  );
}
