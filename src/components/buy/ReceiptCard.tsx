"use client";

import { formatNaira } from "@/lib/money";
import { formatPhoneDisplay } from "@/lib/phone";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { motion, useReducedMotion } from "framer-motion";
import { useBlockingLoader } from "@/components/ui/BlockingLoader";

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
  tokenLabel?: string;
  customerName?: string | null;
  onClose?: () => void;
  celebrate?: boolean;
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
  tokenLabel = "Token / pin",
  customerName,
  onClose,
  celebrate = false,
}: Props) {
  const reduced = useReducedMotion();
  const { active: transactionBlocking } = useBlockingLoader();
  const [copied, setCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const waPhone = process.env.NEXT_PUBLIC_WHATSAPP || "2348000000000";
  const formattedAmount = formatNaira(amount);
  const delivered = status === "DELIVERED";
  const playCelebration = celebrate && delivered && !reduced;
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

  async function copyToken() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.replace(/\s/g, ""));
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in embedded browsers.
    }
  }

  if (celebrate && delivered && transactionBlocking) {
    return <div className="min-h-[420px]" aria-hidden />;
  }

  return (
    <motion.div
      className="space-y-3.5"
      initial={
        playCelebration
          ? {
              opacity: 0,
              y: 28,
              scale: 0.965,
              filter: "blur(9px)",
            }
          : false
      }
      animate={
        playCelebration
          ? {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
            }
          : undefined
      }
      transition={{
        delay: playCelebration ? 0.16 : 0,
        duration: playCelebration ? 0.68 : 0,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <header
        className={cn(
          "relative overflow-hidden rounded-[20px] p-4 text-paper",
          delivered ? "bg-green-deep" : "bg-[#702b2e]"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <motion.span
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-full",
                delivered ? "bg-[#58d68d]/15 text-[#72e5a2]" : "bg-white/10 text-white"
              )}
              aria-hidden
              initial={
                playCelebration
                  ? { opacity: 0, scale: 0.45, rotate: -18 }
                  : false
              }
              animate={
                playCelebration
                  ? { opacity: 1, scale: 1, rotate: 0 }
                  : undefined
              }
              transition={{
                delay: playCelebration ? 0.38 : 0,
                type: "spring",
                stiffness: 310,
                damping: 18,
              }}
            >
              {playCelebration && (
                <motion.span
                  className="pointer-events-none absolute inset-0 rounded-full border border-[#72e5a2]/65"
                  initial={{ opacity: 0.8, scale: 0.75 }}
                  animate={{ opacity: 0, scale: 2.15 }}
                  transition={{ delay: 0.48, duration: 0.82, ease: "easeOut" }}
                />
              )}
              {delivered ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <motion.path
                    d="m6.5 12.5 3.5 3.5 7.5-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={playCelebration ? { pathLength: 0, opacity: 0 } : false}
                    animate={
                      playCelebration
                        ? { pathLength: 1, opacity: 1 }
                        : undefined
                    }
                    transition={{
                      delay: playCelebration ? 0.5 : 0,
                      duration: playCelebration ? 0.48 : 0,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                </svg>
              ) : (
                "!"
              )}
            </motion.span>
            <div>
              <p className="text-sm font-semibold">
                {delivered ? "Payment successful" : "Transaction update"}
              </p>
              <p className="mt-0.5 font-mono-num text-[8px] uppercase tracking-[0.15em] text-paper/45">
                {service} · {status}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 font-mono-num text-[8px] uppercase tracking-wider text-paper/65">
            Receipt
          </span>
        </div>

        <p
          className={cn(
            "mt-5 whitespace-nowrap font-mono-num font-semibold leading-none tracking-[-0.045em]",
            formattedAmount.length > 23
              ? "text-[17px] sm:text-[20px]"
              : formattedAmount.length > 18
                ? "text-[20px] sm:text-[24px]"
                : formattedAmount.length > 14
                  ? "text-[25px] sm:text-[29px]"
                : "text-[34px] sm:text-[38px]"
          )}
        >
          {formattedAmount}
        </p>
        <p className="mt-2 text-xs text-paper/50">
          {planName || service}
          {phone ? ` · ${formatPhoneDisplay(phone)}` : ""}
        </p>
      </header>

      <div className="flex items-center justify-between gap-3 rounded-[14px] border border-dashed border-ink/18 bg-white px-3.5 py-3">
        <div className="min-w-0">
          <p className="font-mono-num text-[8px] uppercase tracking-[0.15em] text-ink/38">
            Order reference
          </p>
          <p className="mt-1 truncate font-mono-num text-[13px] font-semibold text-ink">
            {orderRef}
          </p>
        </div>
        <button
          type="button"
          onClick={copyRef}
          className="pressable min-h-9 shrink-0 rounded-[10px] border border-line bg-paper px-3 text-xs font-semibold text-green"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>

      <dl className="overflow-hidden rounded-[14px] border border-line bg-white text-[13px]">
        <ReceiptRow label="Service" value={service} />
        {planName && (
          <ReceiptRow label="Product" value={planName} />
        )}
        {phone && (
          <ReceiptRow label="Number" value={formatPhoneDisplay(phone)} mono />
        )}
        {networkCode && (
          <ReceiptRow label="Network" value={networkCode} mono />
        )}
        {customerName && <ReceiptRow label="Customer" value={customerName} />}
        <ReceiptRow label="Status" value={status} accent={delivered} />
      </dl>

      {token && (
        <div className="rounded-[16px] bg-green-deep p-4 text-paper">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono-num text-[8px] uppercase tracking-[0.18em] text-amber">
              {tokenLabel}
            </p>
            <button
              type="button"
              onClick={copyToken}
              className="min-h-8 rounded-lg border border-white/10 bg-white/[0.07] px-2.5 text-[10px] font-semibold text-paper"
            >
              {tokenCopied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <p className="mt-3 break-all font-mono-num text-xl font-semibold tracking-[0.08em] sm:text-2xl">
            {token}
          </p>
        </div>
      )}

      {ussdHint && (
        <p className="rounded-[12px] border border-amber/25 bg-amber/[0.09] p-3 font-mono-num text-[11px] text-ink/68">
          Check your balance with {ussdHint}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <a
          className="pressable flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-2 text-center text-[11px] font-semibold text-ink/65"
          href={`/api/receipts/${orderRef}?format=html`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Print / PDF
        </a>
        <a
          className="pressable flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-2 text-center text-[11px] font-semibold text-ink/65"
          href={`/api/receipts/${orderRef}?format=txt`}
          download={`${orderRef}.txt`}
        >
          Download
        </a>
        <a
          className="pressable flex min-h-11 items-center justify-center rounded-xl bg-[#1f9d58] px-2 text-center text-[11px] font-semibold text-white"
          href={`https://wa.me/${waPhone}?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </div>

      {onClose && (
        <Button fullWidth onClick={onClose}>
          Done
        </Button>
      )}
    </motion.div>
  );
}

function ReceiptRow({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-3.5 py-2.5 last:border-0">
      <dt className="text-ink/44">{label}</dt>
      <dd
        className={cn(
          "max-w-[65%] text-right font-medium text-ink/78",
          mono && "font-mono-num",
          accent && "text-green"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
