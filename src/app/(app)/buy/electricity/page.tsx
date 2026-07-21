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
import { TokenReceipt } from "@/components/buy/TokenReceipt";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/cn";

type Biller = { id: string; code: string; name: string };

const QUICK = [1000, 2000, 5000, 10000];

export default function ElectricityPage() {
  const router = useRouter();
  const [billers, setBillers] = useState<Biller[]>([]);
  const [disco, setDisco] = useState("");
  const [meter, setMeter] = useState("");
  const [amount, setAmount] = useState("2000");
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "delivered" | "failed">("idle");
  const [trail, setTrail] = useState<{ at: string; status: string; note?: string }[]>([]);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const n = Number(amount) || 0;
  const meterClean = meter.replace(/\D/g, "");

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog/billers?category=ELECTRICITY").then((r) => r.json()),
      fetch("/api/wallet").then((r) => r.json()),
    ]).then(([b, w]) => {
      setBillers(b.billers || []);
      if (b.billers?.[0]) setDisco(b.billers[0].code);
      if (w.balance != null) setBalance(w.balance);
    });
  }, []);

  async function validateMeter() {
    setError(null);
    setCustomerName(null);
    if (!disco || meterClean.length !== 11) {
      setError("Enter DisCo and 11-digit meter number");
      return;
    }
    setValidating(true);
    try {
      const res = await fetch("/api/vtu/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "METER", disco, meter: meterClean }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Validation failed");
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
      setError("Validate meter first — trust moment before payment");
      return;
    }
    if (n < 500 || n > 200000) {
      setError("Amount must be ₦500 – ₦200,000");
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
      const res = await fetch("/api/vtu/electricity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billerCode: disco,
          meter: meterClean,
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
      setToken(data.transaction.token);
      setTrail(data.transaction.statusTrail || []);
      if (data.balance != null) setBalance(data.balance);
      setStatus("delivered");
      router.refresh();
    });
  }

  const form = (
    <div className="space-y-5">
      <div>
        <p className="font-mono-num mb-2 text-[11px] uppercase tracking-[0.14em] text-ink/70">
          DisCo
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {billers.map((b) => (
            <button
              key={b.code}
              type="button"
              onClick={() => {
                setDisco(b.code);
                setCustomerName(null);
              }}
              className={cn(
                "font-mono-num rounded-lg border px-2 py-2.5 text-xs font-semibold",
                disco === b.code
                  ? "border-green bg-green text-white"
                  : "border-line hover:border-green"
              )}
            >
              {b.code}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Meter number (11 digits)"
        mono
        inputMode="numeric"
        maxLength={11}
        value={meter}
        onChange={(e) => {
          setMeter(e.target.value.replace(/\D/g, "").slice(0, 11));
          setCustomerName(null);
        }}
        placeholder="04123456789"
      />
      <Button variant="ghost" fullWidth onClick={validateMeter} disabled={validating}>
        {validating ? "Validating…" : "Validate meter"}
      </Button>
      {customerName && (
        <div className="rounded-lg border border-green/40 bg-green/5 px-3 py-3">
          <p className="font-mono-num text-[10px] tracking-widest text-green">CUSTOMER</p>
          <p className="mt-1 font-semibold">{customerName}</p>
        </div>
      )}

      <Input
        label="Amount (₦500 – ₦200,000)"
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

      <Button fullWidth size="lg" onClick={openConfirm} disabled={!customerName || n < 500}>
        Continue · <span className="font-mono-num">{formatNaira(n, { compact: true })}</span>
      </Button>
    </div>
  );

  const sheet = (
    <ConfirmPurchaseSheet
      open={open}
      onClose={() => setOpen(false)}
      rows={[
        { label: "DisCo", value: disco, mono: true },
        { label: "Meter", value: meterClean, mono: true },
        { label: "Customer", value: customerName || "—" },
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
        orderRef && token ? (
          <TokenReceipt
            orderRef={orderRef}
            token={token}
            amount={n}
            customerName={customerName}
            meta={`${disco} · ${meterClean}`}
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
          <MotionMobileHeader
            kicker="POWER"
            title="ELECTRICITY."
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
            kicker="BILLS · POWER"
            title="ELECTRICITY."
            description="All major DisCos. Validate meter, pay, get a huge copyable token."
            actions={
              balance != null ? (
                <div className="rounded-xl border border-line bg-green-deep px-5 py-3 text-paper">
                  <p className="font-mono-num text-[10px] text-amber">WALLET</p>
                  <p className="font-mono-num text-xl font-semibold">{formatNaira(balance)}</p>
                </div>
              ) : null
            }
          />
          <div className="grid max-w-5xl items-start gap-8 lg:grid-cols-5">
            <Reveal delay={120} className="lg:col-span-3">
              <div className="surface p-6">{form}</div>
            </Reveal>
            <Reveal delay={200} className="lg:col-span-2">
            <aside className="surface-deep h-full p-6">
              <p className="font-mono-num text-[10px] tracking-widest text-amber">
                TOKEN PREVIEW
              </p>
              <p className="font-display mt-4 text-3xl">LIGHT IN TWENTY.</p>
              <p className="mt-3 text-sm text-paper/65">
                On success the token prints huge in mono — copy once, load forever.
              </p>
              {customerName && (
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="font-mono-num text-[10px] text-paper/40">VALIDATED</p>
                  <p className="mt-1 font-semibold">{customerName}</p>
                  <p className="font-mono-num mt-1 text-sm text-paper/50">{meterClean}</p>
                </div>
              )}
            </aside>
            </Reveal>
          </div>
          {sheet}
        </div>
      </DesktopOnly>
    </>
  );
}
