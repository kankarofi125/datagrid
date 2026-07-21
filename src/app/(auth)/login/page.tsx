"use client";

import { Suspense, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DigitField } from "@/components/ui/DigitField";
import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";
import { sanitizeNgPhoneInput, toLocalPhone, NG_LOCAL_MAX_DIGITS } from "@/lib/phone";

type Step = "phone" | "otp" | "pin-login" | "pin-setup" | "pin-confirm";

function stepTitle(step: Step) {
  switch (step) {
    case "phone":
      return { h: "ENTER YOUR LINE.", d: "We check if this number is already on the grid." };
    case "otp":
      return { h: "VERIFY OTP.", d: "Enter the 4-digit code we sent to your line." };
    case "pin-login":
      return { h: "YOUR PIN.", d: "Welcome back. Enter your 4-digit login PIN." };
    case "pin-setup":
      return { h: "CREATE PIN.", d: "Choose a 4-digit PIN for logins and purchases." };
    case "pin-confirm":
      return { h: "CONFIRM PIN.", d: "Enter the same PIN once more to finish." };
  }
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);
  const [pending, start] = useTransition();

  const local = toLocalPhone(phone);
  const copy = useMemo(() => stepTitle(step), [step]);

  function setPhoneDigits(v: string) {
    setPhone(sanitizeNgPhoneInput(v));
  }

  function continueWithPhone() {
    start(async () => {
      setError(null);
      if (!local) {
        setError("Enter a valid 11-digit Nigerian number");
        return;
      }

      const lookupRes = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const lookup = await lookupRes.json().catch(() => ({}));
      if (!lookupRes.ok) {
        setError(lookup.error || "Could not check number");
        return;
      }

      // Existing user with PIN → login with PIN (no OTP)
      if (lookup.exists && lookup.hasPin) {
        setIsNew(false);
        setPin("");
        setStep("pin-login");
        return;
      }

      // New user or existing without PIN → OTP onboarding
      setIsNew(Boolean(lookup.isNew));
      const otpRes = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const otp = await otpRes.json().catch(() => ({}));
      if (!otpRes.ok) {
        setError(otp.error || "Could not send OTP");
        if (otp.cooldownSec) setCooldown(otp.cooldownSec);
        return;
      }
      setDevHint(otp.devHint);
      setCode("");
      setStep("otp");
    });
  }

  function verifyOtp() {
    start(async () => {
      setError(null);
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code,
          referral: params.get("ref") || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      if (data.needsPinSetup) {
        setPin("");
        setPinConfirm("");
        setStep("pin-setup");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  function loginWithPin() {
    start(async () => {
      setError(null);
      const res = await fetch("/api/auth/pin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Incorrect PIN");
        if (data.code === "PIN_REQUIRED") {
          // Fall back to OTP setup
          continueWithOtpForce();
        }
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  function continueWithOtpForce() {
    start(async () => {
      setError(null);
      const otpRes = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const otp = await otpRes.json().catch(() => ({}));
      if (!otpRes.ok) {
        setError(otp.error || "Could not send OTP");
        return;
      }
      setDevHint(otp.devHint);
      setCode("");
      setStep("otp");
    });
  }

  function onPinSetupNext() {
    setError(null);
    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }
    setPinConfirm("");
    setStep("pin-confirm");
  }

  function savePinAndEnter() {
    start(async () => {
      setError(null);
      if (pin !== pinConfirm) {
        setError("PINs do not match");
        setPin("");
        setPinConfirm("");
        setStep("pin-setup");
        return;
      }
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save PIN");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  const form = (
    <div className="space-y-5">
      {step === "phone" && (
        <>
          <DigitField
            label="Phone number"
            length={NG_LOCAL_MAX_DIGITS}
            value={phone}
            onChange={setPhoneDigits}
            inputMode="tel"
            autoFocus
            aria-label="Nigerian phone number"
          />
          <Button
            fullWidth
            size="lg"
            onClick={continueWithPhone}
            disabled={pending || phone.length < 10}
          >
            {pending ? "Checking…" : "Continue"}
          </Button>
        </>
      )}

      {step === "otp" && (
        <>
          <DigitField
            label="OTP code"
            length={4}
            value={code}
            onChange={setCode}
            autoFocus
            hint={
              devHint
                ? `Dev code: ${devHint}`
                : `Sent to ${local || phone}`
            }
            aria-label="One-time password"
          />
          <Button
            fullWidth
            size="lg"
            onClick={verifyOtp}
            disabled={pending || code.length < 4}
          >
            {pending ? "Verifying…" : isNew ? "Verify & create account" : "Verify"}
          </Button>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs tracking-wide text-ink/50"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
          >
            Change number
          </button>
        </>
      )}

      {step === "pin-login" && (
        <>
          <DigitField
            label="Login PIN"
            length={4}
            value={pin}
            onChange={setPin}
            masked
            autoFocus
            hint={`For ${local || phone}`}
            aria-label="Login PIN"
          />
          <Button
            fullWidth
            size="lg"
            onClick={loginWithPin}
            disabled={pending || pin.length < 4}
          >
            {pending ? "Signing in…" : "Enter the grid"}
          </Button>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs tracking-wide text-ink/50"
            onClick={continueWithOtpForce}
          >
            Use OTP instead
          </button>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs tracking-wide text-ink/40"
            onClick={() => {
              setStep("phone");
              setPin("");
              setError(null);
            }}
          >
            Change number
          </button>
        </>
      )}

      {step === "pin-setup" && (
        <>
          <DigitField
            label="New login PIN"
            length={4}
            value={pin}
            onChange={setPin}
            masked
            autoFocus
            hint="Used for login and wallet purchases"
            aria-label="Create PIN"
          />
          <Button
            fullWidth
            size="lg"
            onClick={onPinSetupNext}
            disabled={pending || pin.length < 4}
          >
            Continue
          </Button>
        </>
      )}

      {step === "pin-confirm" && (
        <>
          <DigitField
            label="Confirm PIN"
            length={4}
            value={pinConfirm}
            onChange={setPinConfirm}
            masked
            autoFocus
            aria-label="Confirm PIN"
          />
          <Button
            fullWidth
            size="lg"
            onClick={savePinAndEnter}
            disabled={pending || pinConfirm.length < 4}
          >
            {pending ? "Saving…" : "Save PIN & enter"}
          </Button>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs tracking-wide text-ink/50"
            onClick={() => {
              setPin("");
              setPinConfirm("");
              setStep("pin-setup");
              setError(null);
            }}
          >
            Start over
          </button>
        </>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
          {cooldown > 0 ? ` (${cooldown}s)` : ""}
        </p>
      )}
    </div>
  );

  return (
    <>
      <div className="mx-auto w-full max-w-md px-4 py-12 lg:hidden">
        <HeroEnter delay={0}>
          <Link href="/" className="font-display text-2xl text-ink">
            DATAGRID
          </Link>
        </HeroEnter>
        <HeroEnter delay={80}>
          <h1 className="font-display mt-8 text-4xl text-ink">{copy.h}</h1>
        </HeroEnter>
        <HeroEnter delay={140}>
          <p className="mt-2 text-ink/60">{copy.d}</p>
        </HeroEnter>
        <OnboardingRail step={step} />
        <Reveal delay={200}>
          <div className="surface mt-6 p-5">{form}</div>
        </Reveal>
        <HeroEnter delay={260}>
          <p className="font-mono-num mt-10 text-[11px] text-ink/40">
            DEMO · 08030000000 · OTP 1234 · PIN 1234
          </p>
        </HeroEnter>
      </div>

      <div className="mx-auto hidden min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden lg:grid lg:grid-cols-2">
        <div className="bg-grid bg-grid-live flex flex-col justify-between p-12 text-paper">
          <HeroEnter delay={0}>
            <Link href="/" className="font-display text-2xl text-amber">
              DATAGRID
            </Link>
          </HeroEnter>
          <div>
            <HeroEnter delay={100}>
              <p className="font-mono-num text-[11px] tracking-[0.2em] text-amber">
                ACCESS CONTROL
              </p>
            </HeroEnter>
            <HeroEnter delay={160}>
              <h1 className="font-display mt-4 text-6xl leading-none">
                ENTER
                <br />
                THE GRID.
              </h1>
            </HeroEnter>
            <HeroEnter delay={240}>
              <p className="mt-4 max-w-sm text-paper/65">
                New lines verify with OTP, then set a PIN. Returning operators unlock with PIN.
              </p>
            </HeroEnter>
          </div>
          <HeroEnter delay={300}>
            <p className="font-mono-num text-[11px] text-paper/40">
              DEMO · 08030000000 · OTP 1234 · PIN 1234
            </p>
          </HeroEnter>
        </div>
        <div className="flex flex-col justify-center bg-paper p-12">
          <HeroEnter delay={120}>
            <h2 className="font-display text-4xl text-ink">{copy.h}</h2>
          </HeroEnter>
          <HeroEnter delay={180}>
            <p className="mt-2 text-ink/60">{copy.d}</p>
          </HeroEnter>
          <OnboardingRail step={step} />
          <Reveal delay={240}>
            <div className="surface mt-6 max-w-sm p-6">{form}</div>
          </Reveal>
        </div>
      </div>
    </>
  );
}

function OnboardingRail({ step }: { step: Step }) {
  const phases = [
    { key: "phone", label: "Line" },
    { key: "verify", label: "Verify" },
    { key: "pin", label: "PIN" },
  ] as const;

  const active =
    step === "phone"
      ? 0
      : step === "otp"
        ? 1
        : 2;

  return (
    <ol className="mt-6 flex items-center gap-2" aria-label="Onboarding progress">
      {phases.map((p, i) => (
        <li key={p.key} className="flex flex-1 items-center gap-2">
          <span
            className={
              i <= active
                ? "font-mono-num flex h-7 w-7 items-center justify-center rounded-full bg-green text-[10px] font-semibold text-white"
                : "font-mono-num flex h-7 w-7 items-center justify-center rounded-full border border-line text-[10px] text-ink/40"
            }
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <span
            className={
              i <= active
                ? "font-mono-num text-[10px] tracking-wide text-ink"
                : "font-mono-num text-[10px] tracking-wide text-ink/35"
            }
          >
            {p.label}
          </span>
          {i < phases.length - 1 && (
            <span
              className={
                i < active ? "h-px flex-1 bg-green" : "h-px flex-1 bg-line"
              }
              aria-hidden
            />
          )}
        </li>
      ))}
    </ol>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-grid-paper">
      <TopUtilityStrip />
      <Suspense fallback={<div className="p-8">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
