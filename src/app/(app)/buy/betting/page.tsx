"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MobileOnly, DesktopOnly, PageHeader } from "@/components/layout/Responsive";
import { MotionMobileHeader } from "@/components/motion/PageChrome";
import { Reveal } from "@/components/motion/Reveal";
import { ConfirmPurchaseSheet } from "@/components/buy/ConfirmPurchaseSheet";
import { ReceiptCard } from "@/components/buy/ReceiptCard";
import { formatNaira } from "@/lib/money";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

type Biller = { code: string; name: string };

const QUICK = [500, 1000, 2000, 5000, 10000];

export default function BettingPage() {
  const router = useRouter();
  const [billers, setBillers] = useState<Biller[]>([]);
  const [billerCode, setBillerCode] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("1000");
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "delivered" | "failed">("idle");
  const [trail, setTrail] = useState<{ at: string; status: string; note?: string }[]>([]);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();
  const [accepted, setAccepted] = useState(false);

  const n = Number(amount) || 0;

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog/billers?category=BETTING").then((r) => r.json()),
      fetch("/api/wallet").then((r) => r.json()),
    ]).then(([b, w]) => {
      setBillers(b.billers || []);
      if (b.billers?.[0]) setBillerCode(b.billers[0].code);
      if (w.balance != null) setBalance(w.balance);
    })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function validateId() {
    setError(null);
    const res = await fetch("/api/vtu/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "BETTING", billerCode, customerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Invalid ID");
      setCustomerName(null);
      return;
    }
    setCustomerName(data.customerName);
  }

  function openConfirm() {
    setError(null);
    if (!accepted) {
      setError("Confirm you are 18+ to continue");
      return;
    }
    if (!customerId.trim() || n < 100) {
      setError("Enter customer ID and amount (min ₦100)");
      return;
    }
    if (balance != null && balance < n) {
      setError("Insufficient balance — fund wallet");
      return;
    }
    setPin("");
    setStatus("idle");
    setTrail([]);
    setOpen(true);
  }

  function pay() {
    start(async () => {
      setStatus("processing");
      setError(null);
      const res = await fetch("/api/vtu/betting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billerCode,
          customerId,
          amount: n,
          pin,
          customerName,
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
    <div className="space-y-5">
      <div className="rounded-lg border border-amber/40 bg-amber/10 p-3 text-sm">
        <strong>18+ only.</strong> Betting products are restricted to adults. Gamble responsibly.
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {billers.map((b) => (
          <button
            key={b.code}
            type="button"
            onClick={() => {
              setBillerCode(b.code);
              setCustomerName(null);
            }}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm font-semibold",
              billerCode === b.code
                ? "border-green bg-green text-white"
                : "border-line hover:border-green"
            )}
          >
            {b.name}
          </button>
        ))}
      </div>

      <Input
        label="Customer / User ID"
        mono
        value={customerId}
        onChange={(e) => {
          setCustomerId(e.target.value);
          setCustomerName(null);
        }}
      />
      <Button variant="ghost" fullWidth onClick={validateId}>
        Validate ID
      </Button>
      {customerName && (
        <p className="rounded-lg border border-green/30 bg-green/5 px-3 py-2 text-sm">
          Verified: <strong>{customerName}</strong>
        </p>
      )}

      <Input
        label="Amount"
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
            className="font-mono-num rounded border border-line px-3 py-2 text-sm hover:border-green"
          >
            {formatNaira(q, { compact: true })}
          </button>
        ))}
      </div>

      <label className="flex items-start gap-2 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 accent-green"
        />
        I confirm I am 18 years or older and accept betting product terms.
      </label>

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

      <Button fullWidth size="lg" onClick={openConfirm}>
        Fund wallet · <span className="font-mono-num">{formatNaira(n, { compact: true })}</span>
      </Button>
    </div>
  );

  const sheet = (
    <ConfirmPurchaseSheet
      open={open}
      onClose={() => setOpen(false)}
      rows={[
        { label: "Platform", value: billerCode, mono: true },
        { label: "Customer ID", value: customerId, mono: true },
        { label: "Name", value: customerName || "—" },
      ]}
      amount={n}
      balanceAfter={balance != null ? Math.max(0, balance - n) : null}
      pin={pin}
      onPinChange={setPin}
      status={status}
      trail={trail}
      error={error}
      pending={pending}
      onConfirm={pay}
      delivered={
        orderRef ? (
          <ReceiptCard
            orderRef={orderRef}
            service="BETTING"
            amount={n}
            planName={`${billerCode} wallet fund`}
            onClose={() => {
              setOpen(false);
              router.push(`/history/${orderRef}`);
            }}
          />
        ) : null
      }
    />
  );

  return (
    <>
      <MobileOnly>
        <div className="space-y-5 px-4 py-6">
          <MotionMobileHeader kicker="18+" title="BETTING." />
          <Reveal delay={120}>{form}</Reveal>
          {sheet}
        </div>
      </MobileOnly>
      <DesktopOnly>
        <div className="px-8 py-8 xl:px-10">
          <PageHeader
            kicker="18+ · WALLET FUND"
            title="BETTING."
            description="Fund Bet9ja, SportyBet, BetKing and more. ID validation where supported."
          />
          <Reveal delay={140}>
            <div className="surface max-w-xl p-6">{form}</div>
          </Reveal>
          {sheet}
        </div>
      </DesktopOnly>
    </>
  );
}
