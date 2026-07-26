"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DigitField } from "@/components/ui/DigitField";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { sanitizeNgPhoneInput, toLocalPhone, NG_LOCAL_MAX_DIGITS } from "@/lib/phone";

/** Default OTP lifetime shown while waiting for server `expiresInSec`. */
const DEFAULT_OTP_TTL_SEC = 120;

type Step =
  | "phone"
  | "otp"
  | "login-2fa"
  | "pin-login"
  | "pin-setup"
  | "pin-confirm";

function formatCountdown(totalSec: number) {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function stepTitle(step: Step) {
  switch (step) {
    case "phone":
      return { h: "ENTER YOUR LINE.", d: "We check if this number is already on the grid." };
    case "otp":
      return { h: "VERIFY OTP.", d: "Enter the 4-digit code we sent to your line." };
    case "login-2fa":
      return {
        h: "EMAIL 2FA.",
        d: "We sent a one-time code to your email. Enter it to finish signing in.",
      };
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
  const googleState = params.get("google");
  const setupPin = params.get("setup") === "pin";
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [isNew, setIsNew] = useState(false);
  const [email2faOn, setEmail2faOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [channelHint, setChannelHint] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpRemainingSec, setOtpRemainingSec] = useState(0);
  const [otpSource, setOtpSource] = useState<"onboard" | "2fa-fallback" | null>(
    null
  );
  const [pending, start] = useTransition();

  function startOtpCountdown(expiresInSec?: number) {
    const sec =
      typeof expiresInSec === "number" && expiresInSec > 0
        ? expiresInSec
        : DEFAULT_OTP_TTL_SEC;
    setOtpExpiresAt(Date.now() + sec * 1000);
    setOtpRemainingSec(sec);
  }

  function clearOtpCountdown() {
    setOtpExpiresAt(null);
    setOtpRemainingSec(0);
  }

  function startCooldown(sec?: number) {
    if (typeof sec === "number" && sec > 0) setCooldown(sec);
  }

  // Tick OTP expiry countdown on otp + email-2fa steps.
  useEffect(() => {
    if (!otpExpiresAt) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
      setOtpRemainingSec(rem);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [otpExpiresAt]);

  // Tick resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  // Server redirected here to finish PIN after OTP/Google (needsPinSetup).
  useEffect(() => {
    if (setupPin) {
      setStep("pin-setup");
      setPin("");
      setPinConfirm("");
      setError(null);
      setIsNew(true);
    }
  }, [setupPin]);

  // Google (or shared) 2FA redirect → show email code step immediately.
  useEffect(() => {
    if (googleState === "2fa" || params.get("login") === "2fa") {
      setStep("login-2fa");
      setCode("");
      setEmail2faOn(true);
      setOtpSource("2fa-fallback");
      const hint = params.get("emailHint");
      if (hint) setEmailHint(hint);
      if (params.get("emailFailed") === "1") {
        setError(
          "Email code could not be sent. Tap “Use phone OTP instead” for WhatsApp/SMS."
        );
      } else {
        setError(null);
        startOtpCountdown(DEFAULT_OTP_TTL_SEC);
      }
    }
  }, [googleState, params]);

  const local = toLocalPhone(phone);
  const copy = useMemo(
    () =>
      step === "phone" && googleState === "phone"
        ? {
            h: "ADD YOUR LINE.",
            d: "Google is verified. Secure your wallet with a Nigerian number.",
          }
        : stepTitle(step),
    [googleState, step]
  );
  const googleNotice =
    params.get("session") === "expired"
      ? "Your session expired after 10 minutes of inactivity. Sign in again."
      : googleMessage(googleState);
  const referral = params.get("ref");
  const googleHref = `/api/auth/google/start${
    referral ? `?ref=${encodeURIComponent(referral)}` : ""
  }`;

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

      // A first-time Google link must prove ownership of the phone, even when
      // that number already has a DataGrid PIN.
      if (googleState === "phone") {
        const otpRes = await fetch("/api/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, googleLink: true }),
        });
        const otp = await otpRes.json().catch(() => ({}));
        if (!otpRes.ok) {
          setError(otp.error || "Could not send OTP");
          startCooldown(otp.cooldownSec);
          return;
        }
        setIsNew(Boolean(otp.isNew));
        setChannelHint(otp.channelHint || null);
        setOtpSource("onboard");
        setCode("");
        startOtpCountdown(otp.expiresInSec);
        setStep("otp");
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

      setEmail2faOn(Boolean(lookup.email2fa));

      // Existing user with PIN → login with PIN (no OTP as first factor)
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
        startCooldown(otp.cooldownSec);
        return;
      }
      setChannelHint(otp.channelHint || null);
      setOtpSource("onboard");
      setCode("");
      startOtpCountdown(otp.expiresInSec);
      setStep("otp");
    });
  }

  function verifyOtp() {
    start(async () => {
      setError(null);
      // After PIN/Google 2FA, phone OTP is second factor (login2fa path when email).
      // For WA fallback we use regular verify with phone + pending2fa on server.
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code,
          referral: params.get("ref") || undefined,
          googleLink: googleState === "phone",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Verification failed");
        if (data.code === "2FA_FIRST_FACTOR_REQUIRED") {
          setStep("pin-login");
          setPin("");
        }
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
          requestPhoneOtp({ onboard: true });
        }
        if (data.retryAfterSec) startCooldown(data.retryAfterSec);
        return;
      }
      if (data.needs2fa) {
        setEmailHint(data.emailHint || null);
        setEmail2faOn(true);
        setOtpSource("2fa-fallback");
        setCode("");
        if (data.emailFailed) {
          setError(
            data.message ||
              "Email code could not be sent. Tap “Use phone OTP instead” for WhatsApp/SMS."
          );
          clearOtpCountdown();
        } else {
          setError(null);
          startOtpCountdown(data.expiresInSec);
        }
        setStep("login-2fa");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  function verifyLogin2fa() {
    start(async () => {
      setError(null);
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          login2fa: true,
          purpose: "login2fa",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Verification failed");
        if (data.code === "2FA_EXPIRED") {
          // Google path has no PIN context — back to phone/Google start.
          if (googleState === "2fa" || !local) {
            setStep("phone");
            setPin("");
            setCode("");
            clearOtpCountdown();
          } else {
            setStep("pin-login");
            setPin("");
          }
        }
        return;
      }
      if (data.needsPinSetup) {
        setStep("pin-setup");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  /**
   * Phone OTP via WhatsApp → SMS fallback.
   * - onboard: public signup / forgot-PIN (no 2FA accounts)
   * - 2fa-fallback: only after PIN/Google parked pendingLogin2fa
   */
  function requestPhoneOtp(opts: { onboard?: boolean; resend?: boolean }) {
    start(async () => {
      setError(null);
      const as2faFallback = !opts.onboard && (otpSource === "2fa-fallback" || step === "login-2fa");
      const otpRes = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone || undefined,
          channels: "whatsapp",
          // Server only honors skip when pending 2FA / Google is present.
          skipCooldown: as2faFallback || Boolean(opts.resend),
          useSessionPhone: as2faFallback,
        }),
      });
      const otp = await otpRes.json().catch(() => ({}));
      if (!otpRes.ok) {
        setError(otp.error || "Could not send OTP");
        startCooldown(otp.cooldownSec);
        if (otp.code === "2FA_PIN_REQUIRED") {
          setStep("pin-login");
        }
        return;
      }
      if (otp.phoneLocal) {
        setPhone(
          String(otp.phoneLocal)
            .replace(/\D/g, "")
            .slice(0, NG_LOCAL_MAX_DIGITS)
        );
      }
      setChannelHint(otp.channelHint || null);
      setCode("");
      if (!as2faFallback) setEmailHint(null);
      setOtpSource(as2faFallback ? "2fa-fallback" : "onboard");
      startOtpCountdown(otp.expiresInSec);
      setStep("otp");
    });
  }

  /** After first factor (PIN/Google 2FA): phone OTP as second factor. */
  function continueWithOtpForce() {
    requestPhoneOtp({ onboard: false });
  }

  /** Forgot PIN — only for accounts without email 2FA. */
  function forgotPinWithOtp() {
    if (email2faOn) {
      setError(
        "Email 2FA is on. Enter your PIN, then use the email code (or phone OTP after PIN). To reset PIN, sign in first then use Settings."
      );
      return;
    }
    requestPhoneOtp({ onboard: true });
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
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "phone") continueWithPhone();
        else if (step === "otp") verifyOtp();
        else if (step === "login-2fa") verifyLogin2fa();
        else if (step === "pin-login") loginWithPin();
        else if (step === "pin-setup") onPinSetupNext();
        else if (step === "pin-confirm") savePinAndEnter();
      }}
    >
      {step === "phone" && (
        <>
          {googleNotice && (
            <div
              className={
                googleState === "phone"
                  ? "rounded-xl border border-green/20 bg-green/[0.06] px-3.5 py-3 text-sm leading-relaxed text-green-deep"
                  : "rounded-xl border border-danger/20 bg-danger/[0.05] px-3.5 py-3 text-sm leading-relaxed text-danger"
              }
              role={googleState === "phone" ? "status" : "alert"}
            >
              {googleNotice}
            </div>
          )}

          {googleState !== "phone" && (
            <>
              <a
                href={googleHref}
                className="pressable flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-ink/12 bg-white px-4 text-[15px] font-semibold text-ink shadow-[0_10px_24px_-20px_rgba(7,31,23,.65)] hover:border-ink/20 hover:bg-paper/60"
                data-haptic="navigation"
              >
                <GoogleIcon />
                Continue with Google
              </a>
              <div className="flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-line" />
                <span className="font-mono-num text-[9px] uppercase tracking-[0.16em] text-ink/35">
                  Or use your phone
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

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
            type="submit"
            fullWidth
            size="lg"
            disabled={pending || !local || phone.length < NG_LOCAL_MAX_DIGITS}
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
              channelHint
                ? `Sent via ${channelHint} to ${local || phone}`
                : `Sent to ${local || phone}`
            }
            aria-label="One-time password"
          />
          <OtpExpiryBanner remainingSec={otpRemainingSec} active={Boolean(otpExpiresAt)} />
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={pending || code.length < 4 || otpRemainingSec <= 0}
          >
            {pending
              ? "Verifying…"
              : otpRemainingSec <= 0
                ? "Code expired"
                : isNew
                  ? "Verify & create account"
                  : "Verify"}
          </Button>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs tracking-wide text-green disabled:opacity-40"
            disabled={pending || cooldown > 0}
            onClick={() =>
              requestPhoneOtp({
                onboard: otpSource !== "2fa-fallback",
                resend: true,
              })
            }
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
          </button>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs tracking-wide text-ink/50"
            onClick={() => {
              setStep(otpSource === "2fa-fallback" ? "login-2fa" : "phone");
              setCode("");
              setError(null);
              clearOtpCountdown();
            }}
          >
            {otpSource === "2fa-fallback" ? "Back to email code" : "Change number"}
          </button>
        </>
      )}

      {step === "login-2fa" && (
        <>
          <DigitField
            label="Email code"
            length={4}
            value={code}
            onChange={setCode}
            autoFocus
            hint={
              emailHint
                ? `Enter the 4 digits sent to ${emailHint}`
                : "Enter the 4-digit code from your email"
            }
            aria-label="Email two-factor code"
          />
          <OtpExpiryBanner remainingSec={otpRemainingSec} active={Boolean(otpExpiresAt)} />
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={pending || code.length < 4 || otpRemainingSec <= 0}
          >
            {pending
              ? "Verifying…"
              : otpRemainingSec <= 0
                ? "Code expired"
                : "Complete sign-in"}
          </Button>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs tracking-wide text-ink/50"
            disabled={pending}
            onClick={() => {
              start(async () => {
                setError(null);
                const res = await fetch("/api/auth/2fa/resend", {
                  method: "POST",
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setError(data.error || "Could not resend code");
                  return;
                }
                if (data.emailHint) setEmailHint(data.emailHint);
                setCode("");
                startOtpCountdown(data.expiresInSec);
              });
            }}
          >
            Resend email code
          </button>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs tracking-wide text-ink/50"
            disabled={pending}
            onClick={continueWithOtpForce}
          >
            Use phone OTP instead
          </button>
          <p className="text-center text-[11px] text-ink/40">
            After PIN/Google, WhatsApp/SMS can replace the email code.
          </p>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs tracking-wide text-ink/40"
            onClick={() => {
              setStep("phone");
              setPin("");
              setCode("");
              setError(null);
              clearOtpCountdown();
            }}
          >
            Start over
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
            type="submit"
            fullWidth
            size="lg"
            disabled={pending || pin.length < 4}
          >
            {pending ? "Signing in…" : "Enter the grid"}
          </Button>
          {!email2faOn && (
            <button
              type="button"
              className="font-mono-num w-full text-center text-xs tracking-wide text-ink/50"
              onClick={forgotPinWithOtp}
            >
              Forgot PIN? Use OTP
            </button>
          )}
          {email2faOn && (
            <p className="text-center text-[11px] leading-relaxed text-ink/45">
              Email 2FA is on — enter your PIN, then the email code. Phone OTP is
              available after PIN if email fails.
            </p>
          )}
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
            type="submit"
            fullWidth
            size="lg"
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
            type="submit"
            fullWidth
            size="lg"
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

      <p className="text-center text-[11px] leading-relaxed text-ink/42">
        By continuing, you agree to the{" "}
        <Link href="/terms" className="font-semibold text-green hover:underline">
          Terms of Service
        </Link>{" "}
        and acknowledge the{" "}
        <Link href="/privacy" className="font-semibold text-green hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );

  return (
    <>
      <div className="mx-auto w-full max-w-md px-4 py-12 lg:hidden">
        <HeroEnter delay={0}>
          <Link href="/" className="inline-block" aria-label="DataGrid home">
            <BrandLogo priority className="w-14" />
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
      </div>

      <div className="mx-auto hidden min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden lg:grid lg:grid-cols-2">
        <div className="bg-grid bg-grid-live flex flex-col justify-between p-12 text-paper">
          <HeroEnter delay={0}>
            <Link href="/" className="inline-block" aria-label="DataGrid home">
              <BrandLogo
                priority
                tone="inverse"
                className="w-16 drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
              />
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
                New lines verify with OTP, then set a PIN. Returning users unlock with
                PIN — and email 2FA when enabled. Optional Google sign-in links to your
                Nigerian number.
              </p>
            </HeroEnter>
          </div>
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

function OtpExpiryBanner({
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
          ? "font-mono-num text-center text-xs tracking-wide text-danger"
          : "font-mono-num text-center text-xs tracking-wide text-ink/55"
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

function googleMessage(state: string | null) {
  switch (state) {
    case "phone":
      return "Google account verified. Add your Nigerian line once, then confirm the OTP to finish linking.";
    case "2fa":
      return "Google verified. Enter the email code we just sent to finish two-factor sign-in.";
    case "cancelled":
      return "Google sign-in was cancelled. You can try again or continue with your phone.";
    case "expired":
      return "That Google sign-in session expired or cookies were blocked. Allow cookies for this site, use one tab only, and try again.";
    case "mismatch":
      return "This Google sign-in no longer matches the original request. Close extra tabs and try Continue with Google once more.";
    case "invalid":
      return "That Google sign-in request could not be verified. Please try again.";
    case "suspended":
      return "This DataGrid account is suspended. Contact support for help.";
    case "config":
      return "Google sign-in is not configured yet. Continue with your phone for now.";
    case "unavailable":
      return "Google sign-in is temporarily unavailable. Please try again or use your phone.";
    default:
      return null;
  }
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.25-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.53l3.35-2.61Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z"
      />
    </svg>
  );
}

function OnboardingRail({ step }: { step: Step }) {
  const phases = [
    { key: "phone", label: "Line" },
    { key: "verify", label: "Verify" },
    { key: "secure", label: "Secure" },
  ] as const;

  const active =
    step === "phone"
      ? 0
      : step === "otp" || step === "login-2fa"
        ? 1
        : step === "pin-login" || step === "pin-setup" || step === "pin-confirm"
          ? 2
          : 0;

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
      <Suspense fallback={<SkeletonPage variant="form" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
