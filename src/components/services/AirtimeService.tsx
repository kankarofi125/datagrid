"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Sheet } from "@/components/ui/Sheet";
import { PinPad } from "@/components/buy/PinPad";
import { StatusTrail } from "@/components/buy/StatusTrail";
import { ReceiptCard } from "@/components/buy/ReceiptCard";
import { MobileOnly, DesktopOnly, PageHeader } from "@/components/layout/Responsive";
import { MotionMobileHeader } from "@/components/motion/PageChrome";
import { Reveal } from "@/components/motion/Reveal";
import {
  detectNetwork,
  formatPhoneDisplay,
  NETWORK_COLORS,
  NETWORK_LABELS,
  networkBadgeStyle,
  toLocalPhone,
} from "@/lib/phone";
import { formatNaira } from "@/lib/money";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { isPinDenied } from "@/lib/pin-feedback";
import { Card } from "@/components/ui/Card";

const QUICK = [100, 200, 500, 1000, 2000, 5000];

export default function AirtimeService({
  initialPhone,
  initialAmount,
}: {
  initialPhone?: string;
  initialAmount?: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone || "");
  const [amount, setAmount] = useState(initialAmount || "500");
  const [balance, setBalance] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "delivered" | "failed">("idle");
  const [trail, setTrail] = useState<{ at: string; status: string; note?: string }[]>([]);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const network = detectNetwork(phone);
  const local = toLocalPhone(phone);
  const n = Number(amount) || 0;

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => {
        if (d.balance != null) setBalance(d.balance);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openSheet() {
    setError(null);
    if (!local) {
      setError("Enter a valid number");
      return;
    }
    if (n < 50 || n > 100000) {
      setError("Airtime must be ₦50 – ₦100,000");
      return;
    }
    if (balance != null && balance < n) {
      setError("Insufficient balance — fund wallet first");
      return;
    }
    setPin("");
    setStatus("idle");
    setTrail([]);
    setOpen(true);
  }

  function buy() {
    start(async () => {
      setStatus("processing");
      setError(null);
      const res = await fetch("/api/vtu/airtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: local,
          amount: n,
          networkCode: network,
          pin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("failed");
        setError(data.error || "Failed");
        if (data.transaction?.statusTrail) setTrail(data.transaction.statusTrail);
        if (data.balance != null) setBalance(data.balance);
        return;
      }
      setOrderRef(data.transaction.orderRef);
      setTrail(data.transaction.statusTrail || []);
      if (data.balance != null) setBalance(data.balance);
      setStatus("delivered");
      router.refresh();
    });
  }

  if (loading) {
    return <SkeletonPage variant="form" />;
  }

  const form = (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        openSheet();
      }}
    >
      <PhoneInput value={phone} onChange={setPhone} />
      {network && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={networkBadgeStyle(network)}
        >
          <span
            className="pulse-dot h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: NETWORK_COLORS[network] }}
          />
          {NETWORK_LABELS[network]}
        </span>
      )}
      <Input
        label="Amount (₦50 – ₦100,000)"
        mono
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setAmount(String(q))}
            className="font-mono-num rounded border border-line px-3 py-2 text-sm transition hover:border-green hover:-translate-y-0.5"
          >
            {formatNaira(q, { compact: true })}
          </button>
        ))}
      </div>
      {error && !open && (
        <p className="text-sm text-danger" role="alert">
          {error}{" "}
          {error.includes("fund") && (
            <Link href="/wallet" className="underline">
              Wallet
            </Link>
          )}
        </p>
      )}
      <Button type="submit" fullWidth size="lg" disabled={!local || n < 50}>
        Buy airtime · <span className="font-mono-num">{formatNaira(n, { compact: true })}</span>
      </Button>
    </form>
  );

  const pinDenied = status === "failed" && isPinDenied(error);

  const sheet = (
    <Sheet open={open} onClose={() => status !== "processing" && setOpen(false)} title="CONFIRM">
      {status === "delivered" && orderRef ? (
        <ReceiptCard
          orderRef={orderRef}
          service="AIRTIME"
          amount={n}
          phone={local}
          networkCode={network}
          onClose={() => {
            setOpen(false);
            router.push(`/history/${orderRef}`);
          }}
        />
      ) : (
        <div className="space-y-4">
          <p className="font-mono-num text-2xl text-green">{formatNaira(n)}</p>
          <p className="text-sm">{local && formatPhoneDisplay(local)}</p>
          {balance != null && (
            <p className="font-mono-num text-xs text-ink/50">
              Balance after: {formatNaira(Math.max(0, balance - n))}
            </p>
          )}
          <PinPad
            value={pin}
            onChange={setPin}
            disabled={pending}
            denied={pinDenied}
          />
          {!pinDenied && (
            <div className="surface p-3">
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
          {error && !pinDenied && <p className="text-sm text-danger">{error}</p>}
          <Button fullWidth size="lg" onClick={buy} disabled={pending || pin.length < 4}>
            {status === "processing" ? "Processing…" : "Confirm with PIN"}
          </Button>
        </div>
      )}
    </Sheet>
  );

  return (
    <>
      <MobileOnly>
        <div className="space-y-5 px-4 py-6">
          <MotionMobileHeader
            kicker="BUY"
            title="AIRTIME."
            trailing={
              balance != null ? (
                <p className="font-mono-num text-sm font-semibold text-green tabular-nums">
                  {formatNaira(balance)}
                </p>
              ) : null
            }
          />
          <Reveal delay={120}>{form}</Reveal>
          {sheet}
        </div>
      </MobileOnly>

      <DesktopOnly>
        <div className="px-8 py-8 xl:px-10">
          <PageHeader
            kicker="VTU DESK · AIRTIME"
            title="BUY AIRTIME."
            description="Self or others · all networks · ₦50–₦100,000 · prefix auto-detect."
          />
          <div className="grid max-w-4xl gap-8 lg:grid-cols-2">
            <Reveal delay={120}>
              <Card className="p-6">{form}</Card>
            </Reveal>
            <Reveal delay={200}>
              <div className="surface-deep p-6">
                <p className="font-mono-num text-[10px] tracking-widest text-amber">PREVIEW</p>
                <p className="font-mono-num mt-4 text-4xl font-semibold tabular-nums">
                  {formatNaira(n || 0)}
                </p>
                <p className="mt-2 text-paper/60">
                  {local ? formatPhoneDisplay(local) : "Enter phone number"}
                  {network ? ` · ${NETWORK_LABELS[network]}` : ""}
                </p>
                <p className="font-mono-num mt-8 text-[11px] leading-relaxed text-paper/40">
                  Instant delivery via provider failover.
                  <br />
                  Confirm with PIN on the next step.
                </p>
              </div>
            </Reveal>
          </div>
          {sheet}
        </div>
      </DesktopOnly>
    </>
  );
}
