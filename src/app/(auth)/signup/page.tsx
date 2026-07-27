"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DigitField } from "@/components/ui/DigitField";
import { Input } from "@/components/ui/Input";
import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import {
  AuthLegalFooter,
  AuthNotice,
  AuthShell,
  AuthTextAction,
} from "@/components/auth/AuthShell";
import { AuthProgressRail } from "@/components/auth/AuthProgressRail";
import {
  AuthOrDivider,
  GoogleAuthButton,
} from "@/components/auth/GoogleAuthButton";
import { AuthStepTransition } from "@/components/auth/AuthStepTransition";
import { AuthPageSkeleton } from "@/components/auth/AuthPageSkeleton";
import {
  sanitizeNgPhoneInput,
  toLocalPhone,
  NG_LOCAL_MAX_DIGITS,
} from "@/lib/phone";
import { OTP_LENGTH, OTP_TTL_SECONDS } from "@/lib/auth/otp-constants";

const DEFAULT_OTP_TTL_SEC = OTP_TTL_SECONDS;

type Step =
  | "details"
  | "phone-otp"
  | "email-otp"
  | "pin-setup"
  | "pin-confirm";

type Busy =
  | null
  | "start"
  | "verifyPhone"
  | "verifyEmail"
  | "resend"
  | "savePin";

function formatCountdown(totalSec: number) {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function stepCopy(step: Step) {
  switch (step) {
    case "details":
      return {
        h: "JOIN THE GRID.",
        d: "Name, email, and your Nigerian line — we verify both before opening a wallet.",
      };
    case "phone-otp":
      return {
        h: "VERIFY YOUR LINE.",
        d: "Enter the 6-digit code we sent to WhatsApp (SMS if WhatsApp fails).",
      };
    case "email-otp":
      return {
        h: "VERIFY YOUR EMAIL.",
        d: "Enter the 6-digit code we emailed. You’ll use this email to sign in later.",
      };
    case "pin-setup":
      return {
        h: "CREATE PIN.",
        d: "Choose a 4-digit PIN for logins and purchases.",
      };
    case "pin-confirm":
      return {
        h: "CONFIRM PIN.",
        d: "Enter the same PIN once more to finish.",
      };
  }
}

function railIndex(step: Step) {
  switch (step) {
    case "details":
      return 0;
    case "phone-otp":
      return 1;
    case "email-otp":
      return 2;
    default:
      return 3;
  }
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-grid-paper">
      <TopUtilityStrip />
      <Suspense fallback={<AuthPageSkeleton compact />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState(params.get("name") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const [phone, setPhone] = useState(() =>
    sanitizeNgPhoneInput(params.get("phone") || "")
  );
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [channelHint, setChannelHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpRemainingSec, setOtpRemainingSec] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState<Busy>(null);
  const busyRef = useRef<Busy>(null);

  const local = toLocalPhone(phone);
  const referral = params.get("ref") || undefined;
  const googlePrefill = params.get("google") === "1";
  const copy = useMemo(() => stepCopy(step), [step]);
  const anyBusy = busy !== null;
  const googleHref = `/api/auth/google/start${
    referral ? `?ref=${encodeURIComponent(referral)}` : ""
  }`;

  async function runBusy(action: Busy, fn: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = action;
    setBusy(action);
    setError(null);
    try {
      await fn();
    } finally {
      busyRef.current = null;
      setBusy(null);
    }
  }

  function startOtpCountdown(expiresInSec?: number) {
    const sec =
      typeof expiresInSec === "number" && expiresInSec > 0
        ? expiresInSec
        : DEFAULT_OTP_TTL_SEC;
    setOtpExpiresAt(Date.now() + sec * 1000);
    setOtpRemainingSec(sec);
  }

  useEffect(() => {
    if (!otpExpiresAt) return;
    const tick = () => {
      setOtpRemainingSec(
        Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000))
      );
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [otpExpiresAt]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000
    );
    return () => window.clearInterval(id);
  }, [cooldown]);

  // Resume mid-signup if session still has pendingSignup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/signup/start");
      const data = await res.json().catch(() => ({}));
      if (cancelled || !data.ok || !data.pending) return;
      const p = data.pending;
      setEmailHint(p.emailHint || null);
      if (p.phoneLocal) {
        setPhone(String(p.phoneLocal).replace(/\D/g, "").slice(0, 11));
      }
      if (p.phoneVerified && p.emailVerified) {
        setStep("pin-setup");
      } else if (p.phoneVerified) {
        setStep("email-otp");
        startOtpCountdown();
      } else {
        setStep("phone-otp");
        startOtpCountdown();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function startSignup() {
    const n = name.trim();
    if (n.length < 2) {
      setError("Enter your full name");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    if (!local) {
      setError("Enter a valid 11-digit Nigerian number");
      return;
    }

    void runBusy("start", async () => {
      const res = await fetch("/api/auth/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          email: email.trim(),
          phone,
          referral,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not start signup");
        if (data.cooldownSec) setCooldown(data.cooldownSec);
        return;
      }
      setEmailHint(data.emailHint || null);
      setChannelHint(data.channelHint || null);
      setCode("");
      startOtpCountdown(data.expiresInSec);
      if (data.emailAlreadyVerified && data.step === "phone-otp") {
        // still need phone first; email skip happens after phone
      }
      setStep("phone-otp");
    });
  }

  function verifyPhone() {
    void runBusy("verifyPhone", async () => {
      const res = await fetch("/api/auth/signup/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Incorrect code");
        if (data.code === "SIGNUP_EXPIRED") setStep("details");
        // Phone may already be verified while email send failed — let them resend.
        if (data.phoneVerified || data.code === "EMAIL_OTP_FAILED") {
          setCode("");
          setStep("email-otp");
        }
        return;
      }
      setCode("");
      setEmailHint(data.emailHint || emailHint);
      if (data.step === "create" || data.emailSkipped) {
        // Finish account creation (email already verified via Google)
        await finishSignup();
        return;
      }
      startOtpCountdown(data.expiresInSec);
      setStep("email-otp");
    });
  }

  async function finishSignup(emailCode?: string) {
    const res = await fetch("/api/auth/signup/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: emailCode || code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not finish signup");
      if (data.code === "SIGNUP_EXPIRED") setStep("details");
      if (data.code === "PHONE_REQUIRED") setStep("phone-otp");
      return false;
    }
    setPin("");
    setPinConfirm("");
    setStep("pin-setup");
    return true;
  }

  function verifyEmail() {
    void runBusy("verifyEmail", async () => {
      await finishSignup(code);
    });
  }

  function resend(channel: "phone" | "email") {
    void runBusy("resend", async () => {
      const res = await fetch("/api/auth/signup/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not resend");
        if (data.cooldownSec) setCooldown(data.cooldownSec);
        if (data.code === "SIGNUP_EXPIRED") setStep("details");
        return;
      }
      if (data.skipped) return;
      setCode("");
      if (data.channelHint) setChannelHint(data.channelHint);
      if (data.emailHint) setEmailHint(data.emailHint);
      startOtpCountdown(data.expiresInSec);
    });
  }

  function savePin() {
    if (pin !== pinConfirm) {
      setError("PINs do not match");
      setPin("");
      setPinConfirm("");
      setStep("pin-setup");
      return;
    }
    void runBusy("savePin", async () => {
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
      router.replace("/dashboard");
    });
  }

  const form = (
    <form
      className="flex flex-col gap-4 sm:gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === "details") startSignup();
        else if (step === "phone-otp") verifyPhone();
        else if (step === "email-otp") verifyEmail();
        else if (step === "pin-setup") {
          if (pin.length === 4) {
            setPinConfirm("");
            setStep("pin-confirm");
          }
        } else if (step === "pin-confirm") savePin();
      }}
    >
      <AuthStepTransition stepKey={step}>
      <div className="flex flex-col gap-4 sm:gap-5">
      {googlePrefill && step === "details" && (
        <AuthNotice tone="success">
          Google verified your email. Confirm your details, add your Nigerian
          line, and we’ll skip the email code after phone verification.
        </AuthNotice>
      )}

      {step === "details" && (
        <>
          {!googlePrefill && (
            <>
              <GoogleAuthButton href={googleHref} />
              <AuthOrDivider label="Or create with details" />
            </>
          )}
          <Input
            name="name"
            label="Full name"
            autoComplete="name"
            value={name}
            maxLength={70}
            placeholder="Your Name"
            autoFocus={googlePrefill}
            onChange={(e) => setName(e.target.value)}
            disabled={anyBusy}
          />
          <Input
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            value={email}
            maxLength={120}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            disabled={anyBusy}
            hint="Sign-in, receipts, and optional 2FA"
          />
          <DigitField
            label="Phone number"
            length={NG_LOCAL_MAX_DIGITS}
            value={phone}
            onChange={(v) => setPhone(sanitizeNgPhoneInput(v))}
            inputMode="tel"
            variant="field"
            disabled={anyBusy}
            aria-label="Nigerian phone number"
            hint="11-digit mobile (e.g. 0803…)"
          />
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={
              anyBusy ||
              name.trim().length < 2 ||
              !email.trim() ||
              phone.length < NG_LOCAL_MAX_DIGITS
            }
          >
            {busy === "start" ? "Sending phone code…" : "Continue"}
          </Button>
          <p className="text-center text-[13px] leading-relaxed text-ink/50">
            Already on the grid?{" "}
            <Link
              href="/login"
              className="font-semibold text-green hover:underline"
            >
              Sign in
            </Link>
          </p>
        </>
      )}

      {step === "phone-otp" && (
        <>
          <DigitField
            label="Phone code"
            length={OTP_LENGTH}
            value={code}
            onChange={setCode}
            autoFocus
            disabled={anyBusy || otpRemainingSec <= 0}
            hint={
              channelHint
                ? `Sent via ${channelHint} to ${local || phone}`
                : `Sent to ${local || phone}`
            }
            aria-label="Phone verification code"
          />
          <OtpBanner remainingSec={otpRemainingSec} active={Boolean(otpExpiresAt)} />
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={
              anyBusy || code.length < OTP_LENGTH || otpRemainingSec <= 0
            }
          >
            {busy === "verifyPhone" ? "Verifying…" : "Verify phone"}
          </Button>
          <div className="flex flex-col gap-0.5">
            <AuthTextAction
              disabled={anyBusy || cooldown > 0}
              onClick={() => resend("phone")}
            >
              {busy === "resend"
                ? "Sending…"
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend code"}
            </AuthTextAction>
            <AuthTextAction
              tone="muted"
              disabled={anyBusy}
              onClick={() => {
                setStep("details");
                setCode("");
                setError(null);
              }}
            >
              Edit details
            </AuthTextAction>
          </div>
        </>
      )}

      {step === "email-otp" && (
        <>
          <DigitField
            label="Email code"
            length={OTP_LENGTH}
            value={code}
            onChange={setCode}
            autoFocus
            disabled={anyBusy || otpRemainingSec <= 0}
            hint={
              emailHint
                ? `Sent to ${emailHint}`
                : "Check your inbox for a 6-digit code"
            }
            aria-label="Email verification code"
          />
          <OtpBanner remainingSec={otpRemainingSec} active={Boolean(otpExpiresAt)} />
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={
              anyBusy || code.length < OTP_LENGTH || otpRemainingSec <= 0
            }
          >
            {busy === "verifyEmail"
              ? "Creating account…"
              : "Verify & create account"}
          </Button>
          <AuthTextAction
            disabled={anyBusy || cooldown > 0}
            onClick={() => resend("email")}
          >
            {busy === "resend"
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend email code"}
          </AuthTextAction>
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
            type="submit"
            fullWidth
            size="lg"
            disabled={anyBusy || pin.length < 4}
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
            disabled={busy === "savePin"}
            aria-label="Confirm PIN"
          />
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={anyBusy || pinConfirm.length < 4}
          >
            {busy === "savePin" ? "Saving PIN…" : "Save PIN & enter"}
          </Button>
          <AuthTextAction
            tone="muted"
            disabled={anyBusy}
            onClick={() => {
              setPin("");
              setPinConfirm("");
              setStep("pin-setup");
            }}
          >
            Start over
          </AuthTextAction>
        </>
      )}

      </div>
      </AuthStepTransition>

      {error && (
        <p
          className="rounded-xl bg-danger/[0.06] px-3 py-2.5 text-[13px] leading-snug text-danger"
          role="alert"
        >
          {error}
          {cooldown > 0 ? ` (${cooldown}s)` : ""}
        </p>
      )}
    </form>
  );

  return (
    <AuthShell
      title={copy.h}
      description={copy.d}
      brandKicker="NEW ACCOUNT"
      brandTitle={
        <>
          JOIN
          <br />
          THE GRID.
        </>
      }
      brandBody="We verify your Nigerian line and email before your wallet opens — so sign-in with phone or email stays trustworthy."
      brandPoints={[
        "Name, email, and phone — verified first",
        "Google optional, then prove your line",
        "One PIN for login and purchases",
      ]}
      rail={
        <AuthProgressRail
          steps={["Details", "Phone", "Email", "PIN"]}
          activeIndex={railIndex(step)}
        />
      }
      footerNote={<AuthLegalFooter />}
    >
      {form}
    </AuthShell>
  );
}

function OtpBanner({
  remainingSec,
  active,
}: {
  remainingSec: number;
  active: boolean;
}) {
  if (!active) return null;
  const expired = remainingSec <= 0;
  return (
    <p
      className={
        expired
          ? "rounded-xl bg-danger/[0.06] px-3 py-2 text-center font-mono-num text-[11px] tracking-wide text-danger"
          : "rounded-xl bg-ink/[0.03] px-3 py-2 text-center font-mono-num text-[11px] tracking-wide text-ink/55"
      }
      role="status"
      aria-live="polite"
    >
      {expired
        ? "Code expired — request a new one"
        : `Code expires in ${formatCountdown(remainingSec)}`}
    </p>
  );
}
