"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Sheet } from "@/components/ui/Sheet";
import { PinPad } from "@/components/buy/PinPad";
import { StatusTrail } from "@/components/buy/StatusTrail";
import { ReceiptCard } from "@/components/buy/ReceiptCard";
import {
  formatPhoneDisplay,
  NETWORK_COLORS,
  NETWORK_LABELS,
  networkBadgeStyle,
} from "@/lib/phone";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/cn";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";
import type { BuyDataState, TypeFilter } from "@/hooks/useBuyData";

export function BuyDataMobile(s: BuyDataState) {
  return (
    <div className="space-y-5 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <HeroEnter delay={0}>
            <p className="font-mono-num text-[11px] tracking-widest text-ink/45">BUY</p>
          </HeroEnter>
          <HeroEnter delay={60}>
            <h1 className="font-display text-3xl text-ink">DATA.</h1>
          </HeroEnter>
        </div>
        {s.balance != null && (
          <HeroEnter delay={100}>
            <Link
              href="/wallet"
              className="surface surface-interactive px-3 py-1.5 text-right"
            >
              <p className="font-mono-num text-[9px] tracking-wide text-ink/45">WALLET</p>
              <p className="font-mono-num text-sm font-semibold text-green tabular-nums">
                {formatNaira(s.balance)}
              </p>
            </Link>
          </HeroEnter>
        )}
      </div>

      <Reveal delay={120}>
        <BuyDataFormBody s={s} compact />
      </Reveal>
    </div>
  );
}

export function BuyDataFormBody({
  s,
  compact,
}: {
  s: BuyDataState;
  compact?: boolean;
}) {
  return (
    <div className="space-y-5">
      {s.beneficiaries.length > 0 && (
        <div>
          <p className="font-mono-num mb-2 text-[10px] tracking-widest text-ink/45">
            BENEFICIARIES
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {s.beneficiaries.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => b.phone && s.setPhone(b.phone)}
                className="edge-card surface shrink-0 px-3 py-2 text-left pressable"
                style={{ borderLeftColor: "#008751" }}
              >
                <p className="text-xs font-semibold">{b.label}</p>
                <p className="font-mono-num text-[10px] text-ink/50">{b.phone}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <PhoneInput value={s.phone} onChange={s.setPhone} />
      {s.network && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={networkBadgeStyle(s.network)}
        >
          <span
            className="pulse-dot h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: NETWORK_COLORS[s.network] }}
          />
          {NETWORK_LABELS[s.network]} detected
        </span>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {(["ALL", "SME", "GIFTING", "RETAIL"] as TypeFilter[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => s.setTypeFilter(t)}
            className={cn(
              "font-mono-num shrink-0 rounded border px-2 py-1 text-[10px] tracking-wide transition",
              s.typeFilter === t
                ? "border-green bg-green text-white"
                : "border-line text-ink/60 hover:border-green/40"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={cn("grid gap-2", !compact && "sm:grid-cols-2 xl:grid-cols-3")}>
        {s.filtered.map((p) => {
          const active = s.selected?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => s.setSelected(p)}
              className={cn(
                "edge-card flex items-center justify-between rounded-lg border bg-paper px-3 py-3 text-left",
                active ? "border-green ring-2 ring-green/20" : "border-line"
              )}
              style={{
                borderLeftWidth: 4,
                borderLeftColor: NETWORK_COLORS[p.networkCode],
              }}
            >
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="font-mono-num text-[11px] text-ink/50">
                  {p.type} · {p.validityDays}D
                </p>
              </div>
              <p className="font-mono-num text-base font-semibold text-green">
                {formatNaira(p.retailPrice, { compact: true })}
              </p>
            </button>
          );
        })}
        {s.filtered.length === 0 && (
          <p className="col-span-full text-sm text-ink/50">
            No plans for this filter. Try another network.
          </p>
        )}
      </div>

      {s.error && !s.open && (
        <p className="text-sm text-danger" role="alert">
          {s.error}{" "}
          {s.error.toLowerCase().includes("fund") && (
            <Link href="/wallet" className="underline">
              Open wallet
            </Link>
          )}
          {s.error.toLowerCase().includes("pin") && (
            <Link href="/settings" className="underline">
              Settings
            </Link>
          )}
        </p>
      )}

      <div className={cn(compact ? "sticky bottom-20 z-10" : "pt-2")}>
        <Button
          fullWidth
          size="lg"
          disabled={!s.selected || !s.local}
          onClick={s.openConfirm}
        >
          Continue
          {s.selected && (
            <span className="font-mono-num">
              {formatNaira(s.selected.retailPrice, { compact: true })}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

export function BuyDataConfirmSheet({ s }: { s: BuyDataState }) {
  return (
    <Sheet
      open={s.open}
      onClose={s.closeSheet}
      title={s.status === "delivered" ? "RECEIPT" : "CONFIRM WITH PIN"}
      className="lg:max-w-md"
    >
      {s.status === "delivered" && s.orderRef && s.selected ? (
        <ReceiptCard
          orderRef={s.orderRef}
          service="DATA"
          amount={s.selected.retailPrice}
          phone={s.local}
          networkCode={s.network}
          planName={s.selected.name}
          ussdHint={s.ussdHint}
          onClose={s.goToReceipt}
        />
      ) : (
        <div className="space-y-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-ink/55">Number</dt>
              <dd className="font-mono-num">
                {s.local ? formatPhoneDisplay(s.local) : "—"}
              </dd>
            </div>
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-ink/55">Plan</dt>
              <dd>{s.selected?.name}</dd>
            </div>
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-ink/55">Price</dt>
              <dd className="font-mono-num text-lg font-semibold text-green">
                {s.selected && formatNaira(s.selected.retailPrice)}
              </dd>
            </div>
            {s.balance != null && s.selected && (
              <div className="flex justify-between border-b border-line py-2">
                <dt className="text-ink/55">Balance after</dt>
                <dd className="font-mono-num">
                  {formatNaira(Math.max(0, s.balance - s.selected.retailPrice))}
                </dd>
              </div>
            )}
          </dl>
          <p className="font-mono-num text-center text-[11px] tracking-widest text-ink/45">
            TRANSACTION PIN
          </p>
          <PinPad
            value={s.pin}
            onChange={s.setPin}
            disabled={s.pending || s.status === "processing"}
          />
          <div className="surface p-3">
            <StatusTrail
              steps={s.trail}
              activeStatus={
                s.status === "processing"
                  ? "PROCESSING"
                  : s.status === "failed"
                    ? "FAILED"
                    : "PENDING"
              }
            />
          </div>
          {s.error && (
            <p className="text-sm text-danger" role="alert">
              {s.error}
            </p>
          )}
          <Button
            fullWidth
            size="lg"
            onClick={s.pay}
            disabled={s.pending || s.pin.length < 4 || s.status === "processing"}
          >
            {s.status === "processing" ? "Processing…" : "Confirm with PIN"}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
