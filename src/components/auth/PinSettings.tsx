"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PinPad } from "@/components/buy/PinPad";
import {
  SecurityOtpStep,
  SecurityStepRail,
} from "@/components/auth/SecurityOtpStep";

type Step = "idle" | "otp" | "new" | "confirm" | "done";

export function PinSettings({ hasPin: initial }: { hasPin: boolean }) {
  const router = useRouter();
  const [hasPin, setHasPin] = useState(initial);
  const [step, setStep] = useState<Step>("idle");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [destinationHint, setDestinationHint] = useState<string | null>(null);
  const [expiresInSec, setExpiresInSec] = useState(120);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const railSteps = hasPin
    ? ["Verify", "New PIN", "Confirm"]
    : ["Create", "Confirm"];
  const railIndex =
    step === "otp" ? 0 : step === "new" ? (hasPin ? 1 : 0) : step === "confirm" ? (hasPin ? 2 : 1) : 0;

  function resetLocal() {
    setPin("");
    setConfirm("");
    setError(null);
    setMsg(null);
  }

  function cancel() {
    resetLocal();
    setStep("idle");
    setDestinationHint(null);
  }

  /** First-time set — no OTP (session is already trusted). */
  function startCreate() {
    resetLocal();
    setStep("new");
  }

  /** Change / reset — phone OTP first. */
  function startChange() {
    start(async () => {
      resetLocal();
      setError(null);
      const res = await fetch("/api/security/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "pin_change" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send verification code");
        return;
      }
      setDestinationHint(data.destinationHint || null);
      setExpiresInSec(data.expiresInSec || 120);
      setStep("otp");
    });
  }

  async function resendOtp() {
    const res = await fetch("/api/security/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "pin_change", resend: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false as const, error: data.error || "Could not resend" };
    }
    if (data.destinationHint) setDestinationHint(data.destinationHint);
    return {
      ok: true as const,
      expiresInSec: data.expiresInSec as number | undefined,
      destinationHint: data.destinationHint as string | undefined,
    };
  }

  async function verifyOtp(code: string) {
    const res = await fetch("/api/security/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "pin_change", code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false as const, error: data.error || "Incorrect code" };
    }
    return { ok: true as const };
  }

  function savePin() {
    if (pin !== confirm) {
      setError("PINs do not match");
      setConfirm("");
      setPin("");
      setStep("new");
      return;
    }
    start(async () => {
      setError(null);
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save PIN");
        if (data.code === "OTP_REQUIRED") setStep("otp");
        return;
      }
      setHasPin(true);
      setStep("done");
      setMsg(
        data.changed
          ? "PIN updated. Use it for purchases and transfers."
          : "PIN created. You’ll need it for every purchase."
      );
      router.refresh();
      window.setTimeout(() => {
        setStep("idle");
        resetLocal();
      }, 2200);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-ink">Transaction PIN</p>
        <p className="mt-1 text-xs leading-relaxed text-ink/55">
          {hasPin
            ? "4-digit PIN for purchases. Changing or resetting always verifies your phone first."
            : "Set a 4-digit PIN before your first spend."}
        </p>
      </div>

      {step !== "idle" && step !== "done" && (
        <SecurityStepRail
          steps={railSteps}
          activeIndex={Math.min(railIndex, railSteps.length - 1)}
        />
      )}

      {step === "idle" && (
        <div className="flex flex-wrap gap-2">
          {hasPin ? (
            <>
              <Button type="button" onClick={startChange} disabled={pending}>
                {pending ? "Sending code…" : "Change / reset PIN"}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={startCreate} disabled={pending}>
              Create PIN
            </Button>
          )}
        </div>
      )}

      {step === "otp" && (
        <SecurityOtpStep
          title="Verify it’s you"
          description="We sent a code to your WhatsApp (SMS if WhatsApp fails). Enter it to unlock PIN change."
          destinationHint={destinationHint}
          initialExpiresInSec={expiresInSec}
          onVerified={() => {
            setPin("");
            setConfirm("");
            setStep("new");
          }}
          onCancel={cancel}
          onResend={resendOtp}
          onVerify={verifyOtp}
        />
      )}

      {step === "new" && (
        <div className="space-y-3">
          <p className="font-mono-num text-center text-[11px] tracking-wide text-ink/50">
            {hasPin ? "CHOOSE A NEW PIN" : "CREATE YOUR PIN"}
          </p>
          <PinPad
            value={pin}
            onChange={setPin}
            onComplete={() => setStep("confirm")}
          />
          <Button
            type="button"
            fullWidth
            disabled={pin.length < 4}
            onClick={() => setStep("confirm")}
          >
            Continue
          </Button>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs text-ink/40"
            onClick={cancel}
          >
            Cancel
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-3">
          <p className="font-mono-num text-center text-[11px] tracking-wide text-ink/50">
            CONFIRM PIN
          </p>
          <PinPad
            value={confirm}
            onChange={setConfirm}
            onComplete={(v) => {
              if (v.length === 4 && pin.length === 4) {
                // defer to save after state settles
              }
            }}
          />
          <Button
            type="button"
            fullWidth
            disabled={confirm.length < 4 || pending}
            onClick={savePin}
          >
            {pending ? "Saving…" : "Save PIN"}
          </Button>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs text-ink/40"
            onClick={() => {
              setConfirm("");
              setStep("new");
              setPin("");
            }}
          >
            Back
          </button>
        </div>
      )}

      {step === "done" && msg && (
        <div className="rounded-xl border border-green/20 bg-green/[0.06] px-3.5 py-3 text-sm text-green-deep">
          {msg}
        </div>
      )}

      {error && step !== "otp" && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {msg && step === "idle" && (
        <p className="text-sm text-green" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
