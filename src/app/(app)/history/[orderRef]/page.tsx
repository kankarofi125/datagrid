import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReceiptViews } from "@/components/history/ReceiptViews";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ orderRef: string }>;
}) {
  const { orderRef } = await params;
  const tx = await prisma.transaction.findUnique({ where: { orderRef } });
  if (!tx) notFound();

  let trail: { at: string; status: string; note?: string }[] = [];
  try {
    trail = JSON.parse(tx.statusTrail);
  } catch {
    trail = [];
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
        trail,
      }}
    />
  );
}
