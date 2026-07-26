"use client";

import { useRef } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { PinPad } from "@/components/buy/PinPad";
import { StatusTrail } from "@/components/buy/StatusTrail";
import { formatNaira } from "@/lib/money";
import { isPinDenied } from "@/lib/pin-feedback";

type Row = { label: string; value: string; mono?: boolean };

export function ConfirmPurchaseSheet({
  open,
  onClose,
  title,
  rows,
  amount,
  balanceAfter,
  pin,
  onPinChange,
  onPinDeniedReset,
  status,
  trail,
  error,
  pending,
  onConfirm,
  delivered,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  rows: Row[];
  amount: number;
  balanceAfter?: number | null;
  pin: string;
  onPinChange: (v: string) => void;
  onPinDeniedReset?: () => void;
  status: "idle" | "processing" | "delivered" | "failed";
  trail: { at: string; status: string; note?: string }[];
  error: string | null;
  pending: boolean;
  /** Called with the completed 4-digit PIN (auto-submit on last digit). */
  onConfirm: (pin: string) => void;
  delivered?: React.ReactNode;
}) {
  const pinDenied =
    status === "failed" &&
    isPinDenied(error);
  const submittingRef = useRef(false);

  function handleComplete(fullPin: string) {
    if (
      submittingRef.current ||
      pending ||
      status === "processing" ||
      status === "delivered"
    ) {
      return;
    }
    submittingRef.current = true;
    onConfirm(fullPin);
    // Allow retry after wrong PIN / failure once pad is cleared.
    window.setTimeout(() => {
      submittingRef.current = false;
    }, 800);
  }

  return (
    <Sheet
      open={open}
      onClose={() => status !== "processing" && onClose()}
      title={status === "delivered" ? "RECEIPT" : title || "CONFIRM WITH PIN"}
      className="lg:max-w-md"
    >
      {status === "delivered" && delivered ? (
        delivered
      ) : (
        <div className="space-y-4">
          <dl className="space-y-2 text-sm">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-3 border-b border-line py-2">
                <dt className="text-ink/55">{r.label}</dt>
                <dd className={r.mono ? "font-mono-num text-right" : "text-right"}>{r.value}</dd>
              </div>
            ))}
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-ink/55">Amount</dt>
              <dd className="font-mono-num text-lg font-semibold text-green">
                {formatNaira(amount)}
              </dd>
            </div>
            {balanceAfter != null && (
              <div className="flex justify-between border-b border-line py-2">
                <dt className="text-ink/55">Balance after</dt>
                <dd className="font-mono-num">{formatNaira(balanceAfter)}</dd>
              </div>
            )}
          </dl>
          <p className="font-mono-num text-center text-[11px] tracking-widest text-ink/45">
            TRANSACTION PIN
          </p>
          <p className="text-center text-xs text-ink/50">
            {status === "processing"
              ? "Processing…"
              : "Enter your 4-digit PIN — payment starts automatically"}
          </p>
          <PinPad
            value={pin}
            onChange={onPinChange}
            onDeniedReset={onPinDeniedReset}
            onComplete={handleComplete}
            disabled={pending || status === "processing"}
            denied={pinDenied}
          />
          {!pinDenied && (
            <div className="rounded-md border border-line bg-ink/[0.03] p-3">
              <StatusTrail
                steps={trail}
                activeStatus={
                  status === "processing"
                    ? "PROCESSING"
                    : status === "failed"
                      ? "FAILED"
                      : "PENDING"
                }
              />
            </div>
          )}
          {error && !pinDenied && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
