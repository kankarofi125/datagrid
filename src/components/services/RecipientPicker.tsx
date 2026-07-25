"use client";

import { PhoneInput } from "@/components/ui/PhoneInput";
import { cn } from "@/lib/cn";
import { formatPhoneDisplay, toLocalPhone } from "@/lib/phone";

export function RecipientPicker({
  value,
  onChange,
  selfPhone,
}: {
  value: string;
  onChange: (value: string) => void;
  selfPhone?: string;
}) {
  const localSelf = selfPhone ? toLocalPhone(selfPhone) : null;
  const buyingForSelf =
    Boolean(localSelf) && toLocalPhone(value) === localSelf;

  return (
    <div className="space-y-3">
      {localSelf && (
        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Choose airtime or data recipient"
        >
          <button
            type="button"
            aria-pressed={buyingForSelf}
            data-haptic="tap"
            onClick={() => onChange(localSelf)}
            className={cn(
              "pressable min-w-0 rounded-xl border px-3 py-2.5 text-left transition",
              buyingForSelf
                ? "border-green bg-green/[0.07] shadow-[0_8px_22px_-18px_rgba(0,135,81,.8)] ring-1 ring-green/10"
                : "border-line bg-white hover:border-green/30"
            )}
          >
            <span className="flex items-center gap-2">
              <RecipientIcon self />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-ink">
                  Buy for myself
                </span>
                <span className="font-mono-num block truncate text-[10px] text-ink/48">
                  {formatPhoneDisplay(localSelf)}
                </span>
              </span>
            </span>
          </button>

          <button
            type="button"
            aria-pressed={!buyingForSelf}
            data-haptic="tap"
            onClick={() => {
              if (buyingForSelf) onChange("");
            }}
            className={cn(
              "pressable min-w-0 rounded-xl border px-3 py-2.5 text-left transition",
              !buyingForSelf
                ? "border-green bg-green/[0.07] shadow-[0_8px_22px_-18px_rgba(0,135,81,.8)] ring-1 ring-green/10"
                : "border-line bg-white hover:border-green/30"
            )}
          >
            <span className="flex items-center gap-2">
              <RecipientIcon />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-ink">
                  Someone else
                </span>
                <span className="block truncate text-[10px] text-ink/48">
                  Enter their number
                </span>
              </span>
            </span>
          </button>
        </div>
      )}

      <PhoneInput
        label="Recipient number"
        value={value}
        onChange={onChange}
        hint={buyingForSelf ? "Your registered DataGrid number" : undefined}
      />
    </div>
  );
}

function RecipientIcon({ self = false }: { self?: boolean }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green/10 text-green"
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        {self ? (
          <>
            <circle cx="12" cy="8" r="3.25" />
            <path d="M5.5 20c.4-4.2 2.6-6.2 6.5-6.2s6.1 2 6.5 6.2" />
          </>
        ) : (
          <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 20c.3-4 2.2-6 5.5-6 1.8 0 3.2.6 4.1 1.7" />
            <path d="M17 13v7M13.5 16.5h7" />
          </>
        )}
      </svg>
    </span>
  );
}
