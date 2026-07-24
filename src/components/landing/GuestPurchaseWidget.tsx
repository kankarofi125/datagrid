"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Sheet } from "@/components/ui/Sheet";
import {
  detectNetwork,
  formatPhoneDisplay,
  NETWORK_COLORS,
  NETWORK_LABELS,
  networkBadgeStyle,
  toLocalPhone,
  type NetworkCode,
} from "@/lib/phone";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/cn";

type Plan = {
  id: string;
  name: string;
  type: string;
  sizeMb: number;
  validityDays: number;
  retailPrice: number;
  networkCode: NetworkCode;
};

type Tab = "AIRTIME" | "DATA" | "ELECTRICITY" | "CABLE";

const DEMO_PLANS: Plan[] = [
  { id: "mtn-1gb", name: "1GB SME", type: "SME", sizeMb: 1024, validityDays: 30, retailPrice: 400, networkCode: "MTN" },
  { id: "mtn-2gb", name: "2GB SME", type: "SME", sizeMb: 2048, validityDays: 30, retailPrice: 750, networkCode: "MTN" },
  { id: "mtn-5gb", name: "5GB SME", type: "SME", sizeMb: 5120, validityDays: 30, retailPrice: 1800, networkCode: "MTN" },
  { id: "glo-1gb", name: "1GB Gifting", type: "GIFTING", sizeMb: 1024, validityDays: 14, retailPrice: 450, networkCode: "GLO" },
  { id: "air-1.5", name: "1.5GB Retail", type: "RETAIL", sizeMb: 1536, validityDays: 30, retailPrice: 500, networkCode: "AIRTEL" },
  { id: "9m-1gb", name: "1GB SME", type: "SME", sizeMb: 1024, validityDays: 30, retailPrice: 400, networkCode: "NINEMOBILE" },
];

export function GuestPurchaseWidget({ plans = DEMO_PLANS }: { plans?: Plan[] }) {
  const [tab, setTab] = useState<Tab>("DATA");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("500");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "delivered" | "failed">("idle");
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const network = detectNetwork(phone);
  const local = toLocalPhone(phone);

  const filteredPlans = useMemo(() => {
    if (!network) return plans.slice(0, 3);
    return plans.filter((p) => p.networkCode === network).slice(0, 6);
  }, [network, plans]);

  function openConfirm(plan?: Plan) {
    setError(null);
    if (!local) {
      setError("Enter a valid Nigerian number (e.g. 0803…)");
      return;
    }
    if (tab === "DATA" && !plan && !selectedPlan) {
      setError("Select a data plan");
      return;
    }
    if (tab === "AIRTIME") {
      const n = Number(amount);
      if (!n || n < 50 || n > 100000) {
        setError("Airtime must be ₦50 – ₦100,000");
        return;
      }
    }
    if (plan) setSelectedPlan(plan);
    setConfirmOpen(true);
    setStatus("idle");
  }

  function runPurchase() {
    startTransition(async () => {
      setStatus("processing");
      setError(null);
      try {
        const body =
          tab === "DATA"
            ? {
                service: "DATA",
                phone: local,
                planId: (selectedPlan || filteredPlans[0])?.id,
                amount: (selectedPlan || filteredPlans[0])?.retailPrice,
                networkCode: network,
              }
            : {
                service: "AIRTIME",
                phone: local,
                amount: Number(amount),
                networkCode: network,
              };

        const res = await fetch("/api/transactions/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Purchase failed");
        setOrderRef(data.orderRef);
        setStatus("delivered");
      } catch (e) {
        setStatus("failed");
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const price =
    tab === "DATA"
      ? (selectedPlan || filteredPlans[0])?.retailPrice ?? 0
      : Number(amount) || 0;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper shadow-[0_24px_60px_-20px_rgba(11,35,26,.22)] ring-1 ring-ink/[0.03]">
      <div className="border-b border-line bg-green-deep px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="font-mono-num text-[10px] tracking-[0.16em] text-amber">
            LIVE PURCHASE · GUEST
          </span>
          <span className="font-mono-num text-[10px] text-paper/50">NO ACCOUNT</span>
        </div>
        <div className="mt-3 flex gap-1">
          {(["DATA", "AIRTIME", "ELECTRICITY", "CABLE"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={cn(
                "font-mono-num flex-1 rounded-md px-1 py-2 text-[10px] tracking-wide transition",
                tab === t
                  ? "bg-green text-white"
                  : "bg-white/5 text-paper/60 hover:bg-white/10"
              )}
            >
              {t === "ELECTRICITY" ? "POWER" : t}
            </button>
          ))}
        </div>
      </div>

      <form
        className="space-y-4 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          openConfirm();
        }}
      >
        {(tab === "DATA" || tab === "AIRTIME") && (
          <>
            <div>
              <PhoneInput value={phone} onChange={setPhone} />
              {network && (
                <div className="mt-2 flex items-center gap-2">
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
                  <span className="font-mono-num text-[11px] text-ink/50">
                    AUTO-DETECT
                  </span>
                </div>
              )}
            </div>

            {tab === "AIRTIME" && (
              <Input
                label="Amount (₦)"
                mono
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
              />
            )}

            {tab === "DATA" && (
              <div className="grid gap-2">
                <span className="font-mono-num text-[11px] uppercase tracking-[0.14em] text-ink/70">
                  Plans {network ? `· ${NETWORK_LABELS[network]}` : ""}
                </span>
                <div className="grid max-h-48 gap-2 overflow-y-auto pr-1">
                  {filteredPlans.map((p) => {
                    const active = selectedPlan?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlan(p)}
                        className={cn(
                          "edge-card flex items-center justify-between rounded-lg border bg-paper px-3 py-3 text-left",
                          active
                            ? "border-green ring-2 ring-green/20"
                            : "border-line"
                        )}
                        style={
                          active && network
                            ? { borderLeftWidth: 4, borderLeftColor: NETWORK_COLORS[network] }
                            : network
                              ? { borderLeftWidth: 3, borderLeftColor: NETWORK_COLORS[p.networkCode] }
                              : undefined
                        }
                      >
                        <div>
                          <div className="font-semibold text-ink">{p.name}</div>
                          <div className="font-mono-num text-[11px] text-ink/50">
                            {p.type} · {p.validityDays}D
                          </div>
                        </div>
                        <div className="font-mono-num text-base font-semibold text-green">
                          {formatNaira(p.retailPrice, { compact: true })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button type="submit" fullWidth size="lg" disabled={pending}>
              {tab === "DATA" ? "Buy data" : "Buy airtime"} —{" "}
              <span className="font-mono-num">{formatNaira(price, { compact: true })}</span>
            </Button>
          </>
        )}

        {(tab === "ELECTRICITY" || tab === "CABLE") && (
          <div className="rounded-lg border border-dashed border-line bg-ink/[0.02] p-6 text-center">
            <p className="font-display text-xl text-ink">
              {tab === "ELECTRICITY" ? "TOKEN IN TWENTY." : "IUC FIRST. THEN PAY."}
            </p>
            <p className="mt-2 text-sm text-ink/60">
              Full flow is live in the app after login. Guest demo ships data + airtime now.
            </p>
            <Button className="mt-4" variant="secondary" onClick={() => setTab("DATA")}>
              Try data instead
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </form>

      <Sheet
        open={confirmOpen}
        onClose={() => {
          if (status !== "processing") setConfirmOpen(false);
        }}
        title={status === "delivered" ? "DELIVERED" : "CONFIRM"}
      >
        {status === "delivered" && orderRef ? (
          <div className="relative space-y-4 overflow-hidden">
            <div className="stamp-delivered pointer-events-none absolute right-2 top-0 rotate-[-8deg] rounded border-4 border-green px-3 py-1 font-display text-2xl text-green opacity-90">
              DELIVERED
            </div>
            <p className="font-mono-num text-xs tracking-widest text-ink/50">ORDER REF</p>
            <p className="font-mono-num text-xl text-ink">{orderRef}</p>
            <p className="text-sm text-ink/70">
              {tab === "DATA" ? selectedPlan?.name || "Data" : `Airtime ${formatNaira(price)}`}{" "}
              → {local ? formatPhoneDisplay(local) : phone}
              {network ? ` (${NETWORK_LABELS[network]})` : ""}
            </p>
            <div className="rounded-lg border border-line bg-green-deep p-4 text-paper">
              <p className="text-sm">Create an account with this number to track &amp; repeat.</p>
              <Button
                className="mt-3"
                variant="amber"
                fullWidth
                onClick={() => {
                  window.location.href = `/login?phone=${encodeURIComponent(local || "")}`;
                }}
              >
                Save this number
              </Button>
            </div>
            <Button variant="ghost" fullWidth onClick={() => setConfirmOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-line py-2">
                <dt className="text-ink/55">Number</dt>
                <dd className="font-mono-num">{local ? formatPhoneDisplay(local) : "—"}</dd>
              </div>
              <div className="flex justify-between border-b border-line py-2">
                <dt className="text-ink/55">Product</dt>
                <dd>
                  {tab === "DATA"
                    ? selectedPlan?.name || filteredPlans[0]?.name
                    : `Airtime`}
                </dd>
              </div>
              <div className="flex justify-between border-b border-line py-2">
                <dt className="text-ink/55">Amount</dt>
                <dd className="font-mono-num text-lg font-semibold text-green">
                  {formatNaira(price)}
                </dd>
              </div>
            </dl>

            <div
              className="rounded-md border border-line bg-ink/[0.03] p-3"
              aria-live="polite"
            >
              {status === "processing" ? (
                <StatusTrail active />
              ) : (
                <p className="font-mono-num text-[11px] tracking-wide text-ink/55">
                  Guest checkout · paid via wallet sim / card in production
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <Button
              fullWidth
              size="lg"
              onClick={runPurchase}
              disabled={pending || status === "processing"}
            >
              {status === "processing" ? "Processing…" : "Confirm purchase"}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function StatusTrail({ active }: { active?: boolean }) {
  const steps = ["Pending", "Processing", "Delivered"];
  return (
    <ol className="flex items-center justify-between gap-2">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col items-center gap-1">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              active && i <= 1 ? "bg-amber pulse-dot" : "bg-ink/20",
              active && i === 1 && "bg-green"
            )}
          />
          <span className="font-mono-num text-[10px] tracking-wide text-ink/60">{s}</span>
        </li>
      ))}
    </ol>
  );
}
