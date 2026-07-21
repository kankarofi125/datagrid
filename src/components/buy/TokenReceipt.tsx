"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatNaira } from "@/lib/money";

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
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(token.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative space-y-4 overflow-hidden">
      <div className="stamp-delivered pointer-events-none absolute right-0 top-0 rotate-[-8deg] rounded border-4 border-green px-3 py-1 font-display text-2xl text-green">
        DELIVERED
      </div>
      <div>
        <p className="font-mono-num text-[10px] tracking-widest text-ink/45">ORDER REF</p>
        <p className="font-mono-num mt-1 text-lg">{orderRef}</p>
      </div>
      {customerName && (
        <p className="text-sm text-ink/70">
          Customer: <span className="font-semibold text-ink">{customerName}</span>
        </p>
      )}
      {meta && <p className="text-sm text-ink/60">{meta}</p>}
      <div className="rounded-xl border-2 border-green bg-green-deep p-5 text-center">
        <p className="font-mono-num text-[10px] tracking-[0.2em] text-amber">{label}</p>
        <p className="font-mono-num mt-3 break-all text-2xl font-semibold tracking-wider text-paper sm:text-3xl">
          {token}
        </p>
        <Button className="mt-4" variant="amber" onClick={copy}>
          {copied ? "Copied ✓" : "Copy token"}
        </Button>
      </div>
      <p className="font-mono-num text-center text-lg text-green">{formatNaira(amount)}</p>
      {onDone && (
        <Button fullWidth onClick={onDone}>
          Done
        </Button>
      )}
    </div>
  );
}
