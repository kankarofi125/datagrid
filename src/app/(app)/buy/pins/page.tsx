"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MobileOnly, DesktopOnly, PageHeader } from "@/components/layout/Responsive";
import { MotionMobileHeader } from "@/components/motion/PageChrome";
import { Reveal } from "@/components/motion/Reveal";
import { ConfirmPurchaseSheet } from "@/components/buy/ConfirmPurchaseSheet";
import { TokenReceipt } from "@/components/buy/TokenReceipt";
import { formatNaira } from "@/lib/money";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

type Biller = {
  code: string;
  name: string;
  packages: { code: string; name: string; amount: number }[];
};

export default function PinsPage() {
  const router = useRouter();
  const [billers, setBillers] = useState<Biller[]>([]);
  const [billerCode, setBillerCode] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "delivered" | "failed">("idle");
  const [trail, setTrail] = useState<{ at: string; status: string; note?: string }[]>([]);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [examPin, setExamPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const biller = billers.find((b) => b.code === billerCode);
  const amount = biller?.packages[0]?.amount || 0;

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog/billers?category=EXAM").then((r) => r.json()),
      fetch("/api/wallet").then((r) => r.json()),
    ]).then(([b, w]) => {
      setBillers(b.billers || []);
      if (b.billers?.[0]) setBillerCode(b.billers[0].code);
      if (w.balance != null) setBalance(w.balance);
    })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openConfirm() {
    setError(null);
    if (!biller) {
      setError("Select an exam body");
      return;
    }
    if (balance != null && balance < amount) {
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
      const res = await fetch("/api/vtu/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billerCode, pin }),
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
      setExamPin(data.transaction.token);
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
      <p className="text-sm text-ink/65">
        Result-checker pins delivered in-app. Copy and use on the exam body portal.
      </p>
      <div className="grid gap-3">
        {billers.map((b) => {
          const price = b.packages[0]?.amount || 0;
          return (
            <button
              key={b.code}
              type="button"
              onClick={() => setBillerCode(b.code)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-4 text-left",
                billerCode === b.code
                  ? "border-green ring-2 ring-green/20"
                  : "border-line hover:border-green"
              )}
            >
              <div>
                <p className="font-display text-2xl">{b.code}</p>
                <p className="text-sm text-ink/55">{b.packages[0]?.name || b.name}</p>
              </div>
              <p className="font-mono-num text-lg font-semibold text-green">
                {formatNaira(price, { compact: true })}
              </p>
            </button>
          );
        })}
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

      <Button fullWidth size="lg" onClick={openConfirm} disabled={!biller}>
        Buy pin · <span className="font-mono-num">{formatNaira(amount, { compact: true })}</span>
      </Button>
    </div>
  );

  const sheet = (
    <ConfirmPurchaseSheet
      open={open}
      onClose={() => setOpen(false)}
      rows={[
        { label: "Exam", value: billerCode, mono: true },
        { label: "Product", value: biller?.packages[0]?.name || "Result checker" },
      ]}
      amount={amount}
      balanceAfter={balance != null ? Math.max(0, balance - amount) : null}
      pin={pin}
      onPinChange={setPin}
      status={status}
      trail={trail}
      error={error}
      pending={pending}
      onConfirm={pay}
      delivered={
        orderRef && examPin ? (
          <TokenReceipt
            orderRef={orderRef}
            token={examPin}
            label={`${billerCode} PIN`}
            amount={amount}
            meta={biller?.packages[0]?.name}
            onDone={() => {
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
          <MotionMobileHeader kicker="EDU" title="EXAM PINS." />
          <Reveal delay={120}>{form}</Reveal>
          {sheet}
        </div>
      </MobileOnly>
      <DesktopOnly>
        <div className="px-8 py-8 xl:px-10">
          <PageHeader
            kicker="EDU · RESULT CHECKERS"
            title="EXAM PINS."
            description="WAEC, NECO, NABTEB — delivered instantly with copyable pin."
            actions={
              balance != null ? (
                <p className="font-mono-num text-lg font-semibold text-green tabular-nums">
                  {formatNaira(balance)}
                </p>
              ) : null
            }
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
