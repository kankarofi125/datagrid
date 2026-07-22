"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Sheet } from "@/components/ui/Sheet";
import { MobileOnly, DesktopOnly, PageHeader } from "@/components/layout/Responsive";
import { MotionMobileHeader } from "@/components/motion/PageChrome";
import { Reveal } from "@/components/motion/Reveal";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/cn";
import { SkeletonPage } from "@/components/ui/Skeleton";

type LedgerRow = {
  id: string;
  direction: string;
  amount: number;
  balanceAfter: number;
  memo: string | null;
  createdAt: string;
};

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [commission, setCommission] = useState(0);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [hidden, setHidden] = useState(false);
  const [amount, setAmount] = useState("2000");
  const [tab, setTab] = useState<"card" | "flutterwave" | "transfer">("transfer");
  const [open, setOpen] = useState(false);
  const [xferOpen, setXferOpen] = useState(false);
  const [xferPhone, setXferPhone] = useState("");
  const [xferAmount, setXferAmount] = useState("500");
  const [xferPin, setXferPin] = useState("");
  const [payoutPin, setPayoutPin] = useState("");
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [va, setVa] = useState<{
    accountNumber: string;
    bankName: string;
    accountName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const refresh = useCallback((isInitial = false) => {
    if (isInitial) setLoading(true);
    return fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => {
        if (d.balance != null) setBalance(d.balance);
        if (d.commissionBalance != null) setCommission(d.commissionBalance);
        if (d.ledger) setLedger(d.ledger);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh(true);
  }, [refresh]);

  function fund() {
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          method:
            tab === "card"
              ? "paystack"
              : tab === "flutterwave"
                ? "flutterwave"
                : "monnify",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed");
        return;
      }
      if (data.virtualAccount) setVa(data.virtualAccount);
      if (data.simulated && data.balance != null) {
        setBalance(data.balance);
        setMsg(
          tab === "flutterwave"
            ? "Flutterwave (sim) credited your wallet."
            : "Paystack (sim) credited your wallet."
        );
        setOpen(false);
        await refresh();
      }
    });
  }

  function transfer() {
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: xferPhone,
          amount: Number(xferAmount),
          pin: xferPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Transfer failed");
        return;
      }
      setBalance(data.balance);
      setMsg(`Sent ${formatNaira(Number(xferAmount))} to ${data.recipient}`);
      setXferOpen(false);
      setXferPin("");
      await refresh();
    });
  }

  function payoutCommission() {
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/wallet/commission/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: payoutPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Payout failed");
        return;
      }
      setBalance(data.balance);
      setMsg(`Moved ${formatNaira(data.amount)} commission → main`);
      setPayoutOpen(false);
      setPayoutPin("");
      await refresh();
    });
  }

  function simulateTransfer() {
    start(async () => {
      const res = await fetch("/api/wallet/fund/simulate-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed");
        return;
      }
      setBalance(data.balance);
      setMsg("Monnify transfer received (sim webhook).");
      setOpen(false);
      await refresh();
    });
  }

  async function copyAccount() {
    if (!va) return;
    try {
      await navigator.clipboard.writeText(va.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const fundSheet = (
    <Sheet open={open} onClose={() => setOpen(false)} title="FUND WALLET">
      <div className="mb-4 grid grid-cols-3 gap-1">
        {(
          [
            ["transfer", "MONNIFY"],
            ["card", "PAYSTACK"],
            ["flutterwave", "FLW"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "font-mono-num rounded py-2 text-[10px]",
              tab === k ? "bg-green text-white" : "border border-line"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <Input
        label="Amount (min ₦100)"
        mono
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {tab === "transfer" && va && (
        <div className="mt-4 rounded-lg border border-line bg-green-deep p-4 text-paper">
          <p className="font-mono-num text-[10px] text-amber">
            RESERVED ACCOUNT · {va.bankName.includes("sim") ? "SIM" : "MONNIFY"}
          </p>
          <button
            type="button"
            onClick={copyAccount}
            className="font-mono-num mt-2 text-left text-2xl tracking-wide"
          >
            {va.accountNumber} {copied ? "✓" : ""}
          </button>
          <p className="mt-1 text-sm">{va.bankName}</p>
          <p className="text-sm text-paper/70">{va.accountName}</p>
          <Button
            className="mt-4"
            variant="amber"
            fullWidth
            onClick={simulateTransfer}
            disabled={pending}
          >
            Simulate bank transfer
          </Button>
        </div>
      )}
      <Button className="mt-4" fullWidth size="lg" onClick={fund} disabled={pending}>
        {tab === "card"
          ? "Pay with Paystack (sim)"
          : tab === "flutterwave"
            ? "Pay with Flutterwave (sim)"
            : va
              ? "Refresh virtual account"
              : "Get virtual account"}
      </Button>
      <p className="font-mono-num mt-3 text-center text-[10px] text-ink/40">
        PAYSTACK → FLUTTERWAVE FALLBACK · MONNIFY VA
      </p>
    </Sheet>
  );

  const xferSheet = (
    <Sheet open={xferOpen} onClose={() => setXferOpen(false)} title="SEND MONEY">
      <div className="space-y-3">
        <PhoneInput
          label="Recipient phone"
          value={xferPhone}
          onChange={setXferPhone}
        />
        <Input
          label="Amount"
          mono
          value={xferAmount}
          onChange={(e) => setXferAmount(e.target.value)}
        />
        <Input
          label="PIN"
          mono
          type="password"
          maxLength={4}
          value={xferPin}
          onChange={(e) => setXferPin(e.target.value)}
        />
        <Button fullWidth onClick={transfer} disabled={pending || xferPin.length < 4}>
          Transfer
        </Button>
      </div>
    </Sheet>
  );

  const payoutSheet = (
    <Sheet open={payoutOpen} onClose={() => setPayoutOpen(false)} title="COMMISSION → MAIN">
      <p className="mb-3 text-sm text-ink/65">
        Available:{" "}
        <span className="font-mono-num font-semibold text-amber">
          {formatNaira(commission)}
        </span>
      </p>
      <Input
        label="PIN"
        mono
        type="password"
        maxLength={4}
        value={payoutPin}
        onChange={(e) => setPayoutPin(e.target.value)}
      />
      <Button
        className="mt-3"
        fullWidth
        onClick={payoutCommission}
        disabled={pending || commission < 1 || payoutPin.length < 4}
      >
        Move all to main wallet
      </Button>
    </Sheet>
  );

  if (loading) {
    return <SkeletonPage variant="list" />;
  }

  const ledgerList = (
    <section>
      <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/45">LEDGER</h2>
      {ledger.length === 0 ? (
        <p className="text-sm text-ink/50">No movements yet. Fund to start.</p>
      ) : (
        <ul className="surface divide-y divide-line overflow-hidden">
          {ledger.map((l) => (
            <li key={l.id} className="flex items-center justify-between px-3 py-3 text-sm lg:px-4">
              <div>
                <p className="font-medium">{l.memo || l.direction}</p>
                <p className="font-mono-num text-[10px] text-ink/45">
                  {new Date(l.createdAt).toLocaleString("en-NG")}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "font-mono-num font-semibold",
                    l.direction === "CREDIT" ? "text-green" : "text-ink"
                  )}
                >
                  {l.direction === "CREDIT" ? "+" : "−"}
                  {formatNaira(l.amount, { compact: true })}
                </p>
                <p className="font-mono-num text-[10px] text-ink/40">
                  {formatNaira(l.balanceAfter, { compact: true })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <>
      <MobileOnly>
        <div className="space-y-6 px-4 py-6">
          <MotionMobileHeader kicker="WALLET" title="BALANCE." />
          <Reveal delay={80}>
            <div className="surface-deep p-5 text-paper">
              <div className="flex items-center gap-3">
                <p className="font-mono-num text-4xl font-semibold tabular-nums text-paper">
                  {hidden ? "₦••••••" : formatNaira(balance)}
                </p>
                <button
                  type="button"
                  className="font-mono-num text-xs text-paper/50"
                  onClick={() => setHidden((h) => !h)}
                >
                  {hidden ? "SHOW" : "HIDE"}
                </button>
              </div>
              {commission > 0 && (
                <p className="font-mono-num mt-2 text-sm text-amber">
                  Commission: {formatNaira(commission)}
                </p>
              )}
            </div>
          </Reveal>
          <Reveal delay={140}>
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" onClick={() => setOpen(true)}>
              Fund wallet
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setXferOpen(true)}>
              Send money
            </Button>
          </div>
          {commission > 0 && (
            <Button variant="amber" fullWidth onClick={() => setPayoutOpen(true)}>
              Payout commission
            </Button>
          )}
          </Reveal>
          <Reveal delay={200}>
          <div className="surface p-4">
            <p className="font-mono-num text-[10px] tracking-widest text-ink/45">
              AIRTIME → CASH
            </p>
            <AirtimeToCashPreview />
          </div>
          </Reveal>
          <Reveal delay={260}>{ledgerList}</Reveal>
          {msg && (
            <p className="text-sm text-green" role="status">
              {msg}
            </p>
          )}
          {fundSheet}
          {xferSheet}
          {payoutSheet}
        </div>
      </MobileOnly>

      <DesktopOnly>
        <div className="px-8 py-8">
          <PageHeader
            kicker="TREASURY"
            title="WALLET."
            description="Fund via Paystack, Flutterwave, or Monnify VA. Send money to other DataGrid users."
            actions={
              <div className="flex gap-2">
                <Button size="lg" variant="ghost" onClick={() => setXferOpen(true)}>
                  Send
                </Button>
                <Button size="lg" onClick={() => setOpen(true)}>
                  Fund wallet
                </Button>
              </div>
            }
          />

          <div className="grid items-start gap-6 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-4">
              <Reveal delay={120}>
              <div className="surface-deep p-6">
                <div className="flex items-center justify-between">
                  <p className="font-mono-num text-[10px] tracking-widest text-amber">
                    MAIN BALANCE
                  </p>
                  <button
                    type="button"
                    className="font-mono-num text-[10px] text-paper/50"
                    onClick={() => setHidden((h) => !h)}
                  >
                    {hidden ? "SHOW" : "HIDE"}
                  </button>
                </div>
                <p className="font-mono-num mt-3 text-4xl font-semibold tabular-nums">
                  {hidden ? "₦••••••" : formatNaira(balance)}
                </p>
                {commission > 0 && (
                  <>
                    <p className="font-mono-num mt-3 text-sm text-amber">
                      Commission {formatNaira(commission)}
                    </p>
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="amber"
                      onClick={() => setPayoutOpen(true)}
                    >
                      Payout to main
                    </Button>
                  </>
                )}
              </div>
              </Reveal>
              <Reveal delay={180}>
              <div className="surface p-6">
                <p className="font-mono-num text-[10px] tracking-widest text-ink/45">
                  AIRTIME → CASH
                </p>
                <AirtimeToCashPreview />
              </div>
              </Reveal>
              {msg && (
                <p className="text-sm text-green" role="status">
                  {msg}
                </p>
              )}
            </div>
            <Reveal delay={160} className="xl:col-span-8">{ledgerList}</Reveal>
          </div>
          {fundSheet}
          {xferSheet}
          {payoutSheet}
        </div>
      </DesktopOnly>
    </>
  );
}

function AirtimeToCashPreview() {
  const [send, setSend] = useState(5000);
  const rate = 0.75;
  const get = Math.floor(send * rate);
  return (
    <div className="mt-3">
      <label className="block text-sm text-ink/65 lg:text-paper/70">
        <span className="text-inherit">Send ₦</span>
        <input
          type="number"
          className="font-mono-num ml-1 w-24 rounded border border-line bg-paper px-2 py-1 text-ink"
          value={send}
          onChange={(e) => setSend(Number(e.target.value) || 0)}
        />{" "}
        MTN
      </label>
      <p className="font-mono-num mt-2 text-lg font-semibold text-green">
        → get {formatNaira(get)} @ 75%
      </p>
      <p className="mt-1 text-xs opacity-50">Live rates admin-editable. Fulfillment in M3.</p>
    </div>
  );
}
