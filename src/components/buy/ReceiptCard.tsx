"use client";

import { formatNaira } from "@/lib/money";
import { formatPhoneDisplay } from "@/lib/phone";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

type Props = {
  orderRef: string;
  service: string;
  amount: number;
  phone?: string | null;
  networkCode?: string | null;
  planName?: string;
  ussdHint?: string | null;
  status?: string;
  token?: string | null;
  onClose?: () => void;
};

export function ReceiptCard({
  orderRef,
  service,
  amount,
  phone,
  networkCode,
  planName,
  ussdHint,
  status = "DELIVERED",
  token,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const waPhone = process.env.NEXT_PUBLIC_WHATSAPP || "2348000000000";
  const shareText = encodeURIComponent(
    `DataGrid ${service} ${status}\n${orderRef}\n${planName || service} ${formatNaira(amount)}\n${phone || ""}`
  );

  async function copyRef() {
    try {
      await navigator.clipboard.writeText(orderRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative space-y-4 overflow-hidden">
      {status === "DELIVERED" && (
        <div className="stamp-delivered pointer-events-none absolute right-0 top-0 rotate-[-8deg] rounded border-4 border-green px-3 py-1 font-display text-2xl text-green">
          DELIVERED
        </div>
      )}
      <div>
        <p className="font-mono-num text-[10px] tracking-widest text-ink/45">ORDER REF</p>
        <button
          type="button"
          onClick={copyRef}
          className="font-mono-num mt-1 text-left text-xl text-ink"
        >
          {orderRef} {copied ? "✓" : ""}
        </button>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between border-b border-line py-2">
          <dt className="text-ink/50">Service</dt>
          <dd>{service}</dd>
        </div>
        {planName && (
          <div className="flex justify-between border-b border-line py-2">
            <dt className="text-ink/50">Plan</dt>
            <dd>{planName}</dd>
          </div>
        )}
        {phone && (
          <div className="flex justify-between border-b border-line py-2">
            <dt className="text-ink/50">Number</dt>
            <dd className="font-mono-num">{formatPhoneDisplay(phone)}</dd>
          </div>
        )}
        {networkCode && (
          <div className="flex justify-between border-b border-line py-2">
            <dt className="text-ink/50">Network</dt>
            <dd className="font-mono-num">{networkCode}</dd>
          </div>
        )}
        <div className="flex justify-between border-b border-line py-2">
          <dt className="text-ink/50">Amount</dt>
          <dd className="font-mono-num text-lg font-semibold text-green">
            {formatNaira(amount)}
          </dd>
        </div>
        {token && (
          <div className="border-b border-line py-2">
            <dt className="text-ink/50">Token / pin</dt>
            <dd className="font-mono-num mt-1 break-all text-xl tracking-wider">{token}</dd>
          </div>
        )}
      </dl>
      {ussdHint && (
        <p className="rounded-md bg-ink/[0.04] p-3 font-mono-num text-xs text-ink/70">
          Check balance: dial {ussdHint}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" className="flex-1" onClick={copyRef}>
          {copied ? "Copied ✓" : "Copy ref"}
        </Button>
        <a
          className="flex-1"
          href={`/api/receipts/${orderRef}?format=html`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="ghost" fullWidth>
            Print / PDF
          </Button>
        </a>
        <a
          className="flex-1"
          href={`/api/receipts/${orderRef}?format=txt`}
          download={`${orderRef}.txt`}
        >
          <Button variant="ghost" fullWidth>
            Download
          </Button>
        </a>
        <a
          className="flex-1"
          href={`https://wa.me/${waPhone}?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="secondary" fullWidth>
            WhatsApp
          </Button>
        </a>
      </div>
      {onClose && (
        <Button fullWidth onClick={onClose}>
          Done
        </Button>
      )}
    </div>
  );
}
