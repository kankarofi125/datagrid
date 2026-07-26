"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { useBlockingLoader } from "@/components/ui/BlockingLoader";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/haptics";
import { formatNaira } from "@/lib/money";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatNigeriaDateTime } from "@/lib/time";

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
  issuedAt?: string | Date | null;
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
  issuedAt,
  onClose,
  celebrate = false,
}: Props) {
  const reduced = useReducedMotion();
  const { active: transactionBlocking } = useBlockingLoader();
  const [copied, setCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const celebrated = useRef(false);
  const formattedAmount = formatNaira(amount);
  const delivered = status === "DELIVERED";
  const playCelebration = celebrate && delivered && !reduced;
  const serviceName = humanize(service);
  const issuedLabel = formatIssuedAt(issuedAt);
  const shareText = [
    "DataGrid receipt",
    `${serviceName} · ${status}`,
    `${planName || serviceName} · ${formattedAmount}`,
    phone ? formatPhoneDisplay(phone) : "",
    `Reference: ${orderRef}`,
  ]
    .filter(Boolean)
    .join("\n");

  useEffect(() => {
    if (
      !celebrate ||
      !delivered ||
      transactionBlocking ||
      celebrated.current
    ) {
      return;
    }
    celebrated.current = true;
    triggerHaptic("success");
  }, [celebrate, delivered, transactionBlocking]);

  async function copyRef() {
    try {
      await navigator.clipboard.writeText(orderRef);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard may be unavailable in embedded browsers. */
    }
  }

  async function copyToken() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.replace(/\s/g, ""));
      setTokenCopied(true);
      window.setTimeout(() => setTokenCopied(false), 1500);
    } catch {
      /* Clipboard may be unavailable in embedded browsers. */
    }
  }

  async function shareReceipt() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `DataGrid receipt · ${orderRef}`,
          text: shareText,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (celebrate && delivered && transactionBlocking) {
    return <div className="min-h-[480px]" aria-hidden />;
  }

  return (
    <motion.section
      className="space-y-3"
      initial={
        playCelebration
          ? { opacity: 0, y: 30, scale: 0.97, filter: "blur(10px)" }
          : false
      }
      animate={
        playCelebration
          ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          : undefined
      }
      transition={{
        delay: playCelebration ? 0.12 : 0,
        duration: playCelebration ? 0.72 : 0,
        ease: [0.16, 1, 0.3, 1],
      }}
      aria-label={`DataGrid receipt for ${orderRef}`}
    >
      <article className="receipt-ticket overflow-hidden rounded-[24px] border border-ink/10 bg-white shadow-[0_24px_70px_-34px_rgba(7,31,23,.5)]">
        <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo variant="mark" className="w-10 sm:w-11" alt="" />
            <div className="min-w-0">
              <p className="font-display text-[20px] leading-none tracking-[0.025em] text-green-deep">
                DATAGRID
              </p>
              <p className="mt-1 truncate font-mono-num text-[8px] uppercase tracking-[0.16em] text-ink/40">
                Secure payment network
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono-num text-[8px] font-semibold uppercase tracking-[0.18em] text-green">
              Official receipt
            </p>
            <p className="mt-1 font-mono-num text-[8px] uppercase tracking-[0.12em] text-ink/35">
              {issuedLabel || "Issued instantly"}
            </p>
          </div>
        </header>

        <section
          className={cn(
            "relative overflow-hidden px-4 py-5 text-paper sm:px-5 sm:py-6",
            delivered ? "bg-green-deep" : "bg-[#702b2e]"
          )}
        >
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <motion.span
                className={cn(
                  "relative grid h-9 w-9 shrink-0 place-items-center rounded-full border",
                  delivered
                    ? "border-[#72e5a2]/25 bg-[#72e5a2]/12 text-[#86edb0]"
                    : "border-white/15 bg-white/10 text-white"
                )}
                initial={
                  playCelebration
                    ? { opacity: 0, scale: 0.45, rotate: -16 }
                    : false
                }
                animate={
                  playCelebration
                    ? { opacity: 1, scale: 1, rotate: 0 }
                    : undefined
                }
                transition={{
                  delay: playCelebration ? 0.35 : 0,
                  type: "spring",
                  stiffness: 320,
                  damping: 18,
                }}
                aria-hidden
              >
                {playCelebration && (
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-full border border-[#86edb0]/60"
                    initial={{ opacity: 0.8, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 2.2 }}
                    transition={{ delay: 0.48, duration: 0.8, ease: "easeOut" }}
                  />
                )}
                {delivered ? (
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
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
                        delay: playCelebration ? 0.48 : 0,
                        duration: playCelebration ? 0.5 : 0,
                      }}
                    />
                  </svg>
                ) : (
                  <span className="font-mono-num font-bold">!</span>
                )}
              </motion.span>
              <div>
                <p className="text-[15px] font-semibold">
                  {delivered ? "Payment confirmed" : "Transaction update"}
                </p>
                <p className="mt-0.5 font-mono-num text-[8px] uppercase tracking-[0.17em] text-paper/48">
                  {serviceName} · {status}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono-num text-[8px] font-semibold uppercase tracking-[0.14em]",
                delivered
                  ? "border-[#86edb0]/20 bg-[#86edb0]/10 text-[#86edb0]"
                  : "border-white/15 bg-white/[0.07] text-white/75"
              )}
            >
              {delivered ? "Verified" : status}
            </span>
          </div>

          <motion.div
            className="relative mt-7"
            initial={playCelebration ? { opacity: 0, y: 14 } : false}
            animate={playCelebration ? { opacity: 1, y: 0 } : undefined}
            transition={{
              delay: playCelebration ? 0.44 : 0,
              duration: playCelebration ? 0.55 : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <p className="font-mono-num text-[8px] uppercase tracking-[0.2em] text-paper/42">
              Total paid
            </p>
            <p
              className={cn(
                "mt-1.5 whitespace-nowrap font-mono-num font-semibold leading-none tracking-[-0.055em]",
                formattedAmount.length > 23
                  ? "text-[17px] sm:text-[20px]"
                  : formattedAmount.length > 18
                    ? "text-[21px] sm:text-[25px]"
                    : formattedAmount.length > 14
                      ? "text-[27px] sm:text-[31px]"
                      : "text-[36px] sm:text-[42px]"
              )}
            >
              {formattedAmount}
            </p>
            <p className="mt-2.5 max-w-[92%] text-xs leading-relaxed text-paper/55">
              {planName || serviceName}
              {phone ? ` · ${formatPhoneDisplay(phone)}` : ""}
            </p>
          </motion.div>
        </section>

        <div className="receipt-perforation" aria-hidden>
          <span />
        </div>

        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <section className="flex items-center justify-between gap-3 rounded-[14px] border border-dashed border-ink/18 bg-paper/65 px-3.5 py-3">
            <div className="min-w-0">
              <p className="font-mono-num text-[8px] uppercase tracking-[0.17em] text-ink/38">
                Transaction reference
              </p>
              <p className="mt-1 truncate font-mono-num text-[12px] font-semibold tracking-[0.025em] text-ink sm:text-[13px]">
                {orderRef}
              </p>
            </div>
            <button
              type="button"
              onClick={copyRef}
              className="pressable min-h-9 shrink-0 rounded-[10px] border border-ink/10 bg-white px-3 font-mono-num text-[10px] font-semibold uppercase tracking-[0.08em] text-green shadow-sm"
              aria-label="Copy transaction reference"
            >
              {copied ? "Copied ✓" : "Copy ref"}
            </button>
          </section>

          <dl className="mt-3 overflow-hidden rounded-[14px] border border-line bg-white">
            <ReceiptRow label="Service" value={serviceName} />
            {planName && <ReceiptRow label="Product" value={planName} />}
            {phone && (
              <ReceiptRow label="Recipient" value={formatPhoneDisplay(phone)} />
            )}
            {networkCode && <ReceiptRow label="Network" value={networkCode} />}
            {customerName && <ReceiptRow label="Customer" value={customerName} />}
            {issuedLabel && <ReceiptRow label="Issued" value={issuedLabel} />}
            <ReceiptRow label="Status" value={status} accent={delivered} />
          </dl>

          {token && (
            <section className="mt-3 overflow-hidden rounded-[16px] border border-green-deep bg-green-deep p-4 text-paper shadow-[0_16px_30px_-22px_rgba(7,31,23,.9)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono-num text-[8px] font-semibold uppercase tracking-[0.2em] text-amber">
                    {tokenLabel}
                  </p>
                  <p className="mt-1 text-[10px] text-paper/45">
                    Keep this code private
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyToken}
                  className="pressable min-h-8 rounded-lg border border-white/12 bg-white/[0.07] px-2.5 font-mono-num text-[9px] font-semibold uppercase tracking-[0.1em] text-paper"
                  aria-label={`Copy ${tokenLabel}`}
                >
                  {tokenCopied ? "Copied ✓" : "Copy code"}
                </button>
              </div>
              <p className="mt-4 break-all font-mono-num text-[19px] font-semibold leading-relaxed tracking-[0.1em] sm:text-[23px]">
                {token}
              </p>
            </section>
          )}

          {ussdHint && (
            <p className="mt-3 rounded-[12px] border border-amber/25 bg-amber/[0.09] p-3 font-mono-num text-[10px] leading-relaxed text-ink/68">
              BALANCE CHECK · {ussdHint}
            </p>
          )}

          <footer className="mt-4 flex items-center gap-2.5 border-t border-dashed border-ink/14 pt-3.5">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green/[0.08] text-green"
              aria-hidden
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="M12 3.5 19 6v5.2c0 4.2-2.8 7.8-7 9.3-4.2-1.5-7-5.1-7-9.3V6l7-2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p className="font-mono-num text-[9px] font-semibold uppercase tracking-[0.12em] text-ink/70">
                Verified by DataGrid
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-ink/40">
                Secure transaction record · quote the reference for support
              </p>
            </div>
          </footer>
        </div>
      </article>

      <div className="grid grid-cols-3 gap-2">
        <ReceiptAction
          href={`/api/receipts/${orderRef}?format=html`}
          label="Print / PDF"
          icon={<PrintIcon />}
          external
        />
        <ReceiptAction
          href={`/api/receipts/${orderRef}?format=txt`}
          label="Save"
          icon={<DownloadIcon />}
          download={`${orderRef}.txt`}
        />
        <button
          type="button"
          onClick={shareReceipt}
          className="pressable flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl bg-green px-2 text-[10px] font-semibold text-white shadow-[0_10px_20px_-12px_rgba(0,135,81,.8)]"
          aria-label="Share receipt"
        >
          <ShareIcon />
          Share
        </button>
      </div>

      {onClose && (
        <Button fullWidth size="lg" onClick={onClose}>
          Done
        </Button>
      )}
    </motion.section>
  );
}

function ReceiptRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-3.5 py-2.5 last:border-0">
      <dt className="pt-0.5 font-mono-num text-[8px] uppercase tracking-[0.14em] text-ink/38">
        {label}
      </dt>
      <dd
        className={cn(
          "max-w-[68%] text-right font-mono-num text-[11px] font-medium leading-relaxed text-ink/76 sm:text-[12px]",
          accent && "font-semibold text-green"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ReceiptAction({
  href,
  label,
  icon,
  external,
  download,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
  download?: string;
}) {
  return (
    <a
      className="pressable flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-ink/10 bg-white px-2 text-[10px] font-semibold text-ink/62 shadow-[0_8px_18px_-16px_rgba(7,31,23,.5)]"
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      download={download}
    >
      {icon}
      {label}
    </a>
  );
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatIssuedAt(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatNigeriaDateTime(date);
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v6H7v-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m8.3 10.9 7.4-4.6M8.3 13.1l7.4 4.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
