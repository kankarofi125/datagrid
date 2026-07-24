"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PinPad } from "@/components/buy/PinPad";

export function PinSettings({ hasPin: initial }: { hasPin: boolean }) {
  const router = useRouter();
  const [hasPin, setHasPin] = useState(initial);
  const [step, setStep] = useState<"idle" | "current" | "new" | "confirm">("idle");
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function startSet() {
    setError(null);
    setMsg(null);
    setCurrentPin("");
    setPin("");
    setConfirm("");
    setStep(hasPin ? "current" : "new");
  }

  function onCurrentDone() {
    if (currentPin.length === 4) setStep("new");
  }

  function onNewDone() {
    if (pin.length === 4) setStep("confirm");
  }

  function submit() {
    if (pin !== confirm) {
      setError("PINs do not match");
      setConfirm("");
      setStep("new");
      setPin("");
      return;
    }
    start(async () => {
      setError(null);
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          currentPin: hasPin ? currentPin : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setHasPin(true);
      setStep("idle");
      setMsg("Transaction PIN saved.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-line p-4">
      <p className="font-mono-num text-[10px] tracking-widest text-ink/45">
        TRANSACTION PIN
      </p>
      <p className="mt-1 text-sm text-ink/70">
        {hasPin
          ? "4-digit PIN required for every purchase."
          : "Set a PIN before your first spend."}
      </p>

      {step === "idle" ? (
        <Button className="mt-3" variant="ghost" onClick={startSet}>
          {hasPin ? "Change PIN" : "Set PIN"}
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          {step === "current" && (
            <>
              <p className="font-mono-num text-center text-[11px] text-ink/50">
                CURRENT PIN
              </p>
              <PinPad value={currentPin} onChange={setCurrentPin} />
              <Button fullWidth disabled={currentPin.length < 4} onClick={onCurrentDone}>
                Next
              </Button>
            </>
          )}
          {step === "new" && (
            <>
              <p className="font-mono-num text-center text-[11px] text-ink/50">NEW PIN</p>
              <PinPad value={pin} onChange={setPin} />
              <Button fullWidth disabled={pin.length < 4} onClick={onNewDone}>
                Next
              </Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <p className="font-mono-num text-center text-[11px] text-ink/50">
                CONFIRM PIN
              </p>
              <PinPad value={confirm} onChange={setConfirm} />
              <Button
                fullWidth
                disabled={confirm.length < 4 || pending}
                onClick={submit}
              >
                Save PIN
              </Button>
            </>
          )}
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs text-ink/40"
            onClick={() => setStep("idle")}
          >
            Cancel
          </button>
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {msg && (
        <p className="mt-2 text-sm text-green" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
