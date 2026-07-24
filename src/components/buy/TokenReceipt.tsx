"use client";

import { ReceiptCard } from "@/components/buy/ReceiptCard";

export function TokenReceipt({
  orderRef,
  token,
  label = "TOKEN",
  amount,
  customerName,
  meta,
  onDone,
}: {
  orderRef: string;
  token: string;
  label?: string;
  amount: number;
  customerName?: string | null;
  meta?: string;
  onDone?: () => void;
}) {
  return (
    <ReceiptCard
      orderRef={orderRef}
      service={label}
      amount={amount}
      planName={meta}
      customerName={customerName}
      token={token}
      tokenLabel={label}
      onClose={onDone}
    />
  );
}
