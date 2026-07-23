"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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

type Pkg = { code: string; name: string; amount: number };
type Biller = { code: string; name: string; packages: Pkg[] };

export default function CablePage() {
  const router = useRouter();
  const [billers, setBillers] = useState<Biller[]>([]);
  const [billerCode, setBillerCode] = useState("");
  const [smartCard, setSmartCard] = useState("");
  const [packageCode, setPackageCode] = useState("");
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "delivered" | "failed">("idle");
  const [trail, setTrail] = useState<{ at: string; status: string; note?: string }[]>([]);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const biller = useMemo(
    () => billers.find((b) => b.code === billerCode),
    [billers, billerCode]
  );
  const pkg = biller?.packages.find((p) => p.code === packageCode);
  const amount = pkg?.amount || 0;

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog/billers?category=CABLE").then((r) => r.json()),
      fetch("/api/wallet").then((r) => r.json()),
    ]).then(([b, w]) => {
      const list = b.billers || [];
      setBillers(list);
      if (list[0]) {
        setBillerCode(list[0].code);
        if (list[0].packages?.[0]) setPackageCode(list[0].packages[0].code);
      }
      if (w.balance != null) setBalance(w.balance);
    })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function validateIUC() {
    setError(null);
    setCustomerName(null);
    setValidating(true);
    try {
      const res = await fetch("/api/vtu/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "IUC",
          billerCode,
          smartCard,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid IUC");
        return;
      }
      setCustomerName(data.customerName);
    } finally {
      setValidating(false);
    }
  }

  function openConfirm() {
    setError(null);
    if (!customerName) {
      setError("Validate smartcard / IUC first");
      return;
    }
    if (!pkg) {
      setError("Select a package");
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
      const res = await fetch("/api/vtu/cable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billerCode,
          smartCard,
          packageCode,
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
      <div className="flex flex-wrap gap-2">
        {billers.map((b) => (
          <button
            key={b.code}
            type="button"
            onClick={() => {
              setBillerCode(b.code);
              setPackageCode(b.packages[0]?.code || "");
              setCustomerName(null);
            }}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-semibold",
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
        label="Smartcard / IUC number"
        mono
        inputMode="numeric"
        value={smartCard}
        onChange={(e) => {
          setSmartCard(e.target.value);
          setCustomerName(null);
        }}
        placeholder="1234567890"
      />
      <Button variant="ghost" fullWidth onClick={validateIUC} disabled={validating}>
        {validating ? "Validating…" : "Validate & show name"}
      </Button>
      {customerName && (
        <div className="rounded-lg border border-green/40 bg-green/5 px-3 py-3">
          <p className="font-mono-num text-[10px] tracking-widest text-green">
            TRUST MOMENT · CUSTOMER
          </p>
          <p className="mt-1 text-lg font-semibold">{customerName}</p>
        </div>
      )}

      <div>
        <p className="font-mono-num mb-2 text-[11px] uppercase tracking-[0.14em] text-ink/70">
          Package
        </p>
        <div className="grid gap-2">
          {(biller?.packages || []).map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => setPackageCode(p.code)}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-3 text-left",
                packageCode === p.code
                  ? "border-green ring-2 ring-green/20"
                  : "border-line"
              )}
            >
              <span className="font-semibold">{p.name}</span>
              <span className="font-mono-num text-green">
                {formatNaira(p.amount, { compact: true })}
              </span>
            </button>
          ))}
        </div>
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

      <Button fullWidth size="lg" onClick={openConfirm} disabled={!customerName || !pkg}>
        Continue ·{" "}
        <span className="font-mono-num">{formatNaira(amount, { compact: true })}</span>
      </Button>
    </div>
  );

  const sheet = (
    <ConfirmPurchaseSheet
      open={open}
      onClose={() => setOpen(false)}
      rows={[
        { label: "Biller", value: biller?.name || billerCode },
        { label: "IUC", value: smartCard, mono: true },
        { label: "Customer", value: customerName || "—" },
        { label: "Package", value: pkg?.name || "—" },
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
        orderRef ? (
          <ReceiptCard
            orderRef={orderRef}
            service="CABLE"
            amount={amount}
            planName={`${biller?.name} · ${pkg?.name}`}
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
          <MotionMobileHeader kicker="TV" title="CABLE." />
          <Reveal delay={120}>{form}</Reveal>
          {sheet}
        </div>
      </MobileOnly>
      <DesktopOnly>
        <div className="px-8 py-8 xl:px-10">
          <PageHeader
            kicker="BILLS · TV"
            title="CABLE TV."
            description="IUC validation returns the customer name before you pay."
            actions={
              balance != null ? (
                <p className="font-mono-num text-lg font-semibold text-green tabular-nums">
                  {formatNaira(balance)}
                </p>
              ) : null
            }
          />
          <Reveal delay={140}>
            <div className="surface max-w-2xl p-6">{form}</div>
          </Reveal>
          {sheet}
        </div>
      </DesktopOnly>
    </>
  );
}
