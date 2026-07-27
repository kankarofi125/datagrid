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
  IdentifierToggle,
  type IdentifierMode,
} from "@/components/auth/IdentifierToggle";
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
  | "identify"
  | "otp"
  | "login-2fa"
  | "pin-login"
  | "pin-setup"
  | "pin-confirm";

type BusyAction =
  | null
  | "lookup"
  | "sendOtp"
  | "resendOtp"
  | "verifyOtp"
  | "pinLogin"
  | "verify2fa"
  | "resend2fa"
  | "savePin";

function formatCountdown(totalSec: number) {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function stepTitle(step: Step, mode: IdentifierMode) {
  switch (step) {
    case "identify":
      return mode === "email"
        ? {
            h: "ENTER YOUR EMAIL.",
            d: "We’ll check for an account, then unlock with PIN or a one-time code.",
          }
        : {
            h: "ENTER YOUR LINE.",
            d: "We’ll check for an account, then unlock with PIN or a one-time code.",
          };
    case "otp":
      return mode === "email"
        ? {
            h: "VERIFY EMAIL OTP.",
            d: "Enter the 6-digit code we sent to your email.",
          }
        : {
            h: "VERIFY OTP.",
            d: "Enter the 6-digit code we sent to your line.",
          };
    case "login-2fa":
      return {
        h: "EMAIL 2FA.",
        d: "We sent a 6-digit code to your email. Enter it to finish signing in.",
      };
    case "pin-login":
      return { h: "YOUR PIN.", d: "Welcome back. Enter your 4-digit login PIN." };
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

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-grid-paper">
      <TopUtilityStrip />
      <Suspense fallback={<AuthPageSkeleton compact />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const googleState = params.get("google");
  const setupPin = params.get("setup") === "pin";
  const login2faParam =
    googleState === "2fa" || params.get("login") === "2fa";
  const emailFailedParam = params.get("emailFailed") === "1";
  const initialEmailHint = params.get("emailHint");

  const [mode, setMode] = useState<IdentifierMode>(() =>
    googleState === "phone" || !params.get("email") ? "phone" : "email"
  );
  const [phone, setPhone] = useState(() =>
    sanitizeNgPhoneInput(params.get("phone") || "")
  );
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [step, setStep] = useState<Step>(() => {
    if (setupPin) return "pin-setup";
    if (login2faParam) return "login-2fa";
    return "identify";
  });
  const [email2faOn, setEmail2faOn] = useState(login2faParam);
  const [error, setError] = useState<string | null>(() => {
    if (login2faParam && emailFailedParam) {
      return "Email code could not be sent. Tap “Use phone OTP instead” for WhatsApp/SMS.";
    }
    return null;
  });
  const [emailHint, setEmailHint] = useState<string | null>(initialEmailHint);
  const [channelHint, setChannelHint] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(() =>
    login2faParam && !emailFailedParam
      ? Date.now() + DEFAULT_OTP_TTL_SEC * 1000
      : null
  );
  const [otpRemainingSec, setOtpRemainingSec] = useState(() =>
    login2faParam && !emailFailedParam ? DEFAULT_OTP_TTL_SEC : 0
  );
  const [otpSource, setOtpSource] = useState<"login" | "2fa-fallback" | null>(
    () => (login2faParam ? "2fa-fallback" : null)
  );
  const [busy, setBusy] = useState<BusyAction>(null);
  const busyRef = useRef<BusyAction>(null);

  async function runBusy(action: BusyAction, fn: () => Promise<void>) {
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

  function goDashboard() {
    router.replace("/dashboard");
  }

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

  const local = toLocalPhone(phone);
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const copy = useMemo(
    () =>
      step === "identify" && googleState === "phone"
        ? {
            h: "ADD YOUR LINE.",
            d: "Google is verified. Secure your wallet with a Nigerian number.",
          }
        : stepTitle(step, mode),
    [googleState, step, mode]
  );

  const googleNotice =
    params.get("session") === "expired"
      ? "Your session expired after 10 minutes of inactivity. Sign in again."
      : googleMessage(googleState);

  const referral = params.get("ref");
  const googleHref = `/api/auth/google/start${
    referral ? `?ref=${encodeURIComponent(referral)}` : ""
  }`;

  function signupHref() {
    const q = new URLSearchParams();
    if (mode === "phone" && local) q.set("phone", local);
    if (mode === "email" && email.trim()) q.set("email", email.trim());
    if (referral) q.set("ref", referral);
    const s = q.toString();
    return s ? `/signup?${s}` : "/signup";
  }

  function continueIdentify() {
    if (mode === "phone" && !local) {
      setError("Enter a valid 11-digit Nigerian number");
      return;
    }
    if (mode === "email" && !emailLooksValid) {
      setError("Enter a valid email address");
      return;
    }

    void runBusy(
      googleState === "phone" ? "sendOtp" : "lookup",
      async () => {
        if (googleState === "phone") {
          await sendOtpRequest({ googleLink: true });
          return;
        }

        const lookupRes = await fetch("/api/auth/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "email" ? { email: email.trim() } : { phone }
          ),
        });
        const lookup = await lookupRes.json().catch(() => ({}));
        if (!lookupRes.ok) {
          setError(lookup.error || "Could not check account");
          return;
        }

        setEmail2faOn(Boolean(lookup.email2fa));
        if (lookup.emailHint) setEmailHint(lookup.emailHint);
        if (lookup.phoneLocal) {
          setPhone(
            String(lookup.phoneLocal)
              .replace(/\D/g, "")
              .slice(0, NG_LOCAL_MAX_DIGITS)
          );
        }

        if (lookup.isNew || !lookup.exists) {
          setError(
            mode === "email"
              ? "No account for this email."
              : "No account for this number."
          );
          return;
        }

        if (lookup.hasPin) {
          setPin("");
          setStep("pin-login");
          return;
        }

        // Existing account without PIN → OTP then PIN setup
        setBusy("sendOtp");
        busyRef.current = "sendOtp";
        await sendOtpRequest({});
      }
    );
  }

  async function sendOtpRequest(opts: {
    resend?: boolean;
    googleLink?: boolean;
  }) {
    const as2faFallback =
      !opts.googleLink &&
      (otpSource === "2fa-fallback" || step === "login-2fa");

    const body: Record<string, unknown> = {
      googleLink: opts.googleLink === true,
      skipCooldown: as2faFallback || Boolean(opts.resend),
      useSessionPhone: as2faFallback,
    };

    if (as2faFallback) {
      // server resolves phone from session
    } else if (opts.googleLink || mode === "phone") {
      body.phone = phone;
    } else {
      body.email = email.trim();
    }

    const otpRes = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const otp = await otpRes.json().catch(() => ({}));
    if (!otpRes.ok) {
      setError(otp.error || "Could not send OTP");
      startCooldown(otp.cooldownSec);
      if (otp.code === "2FA_PIN_REQUIRED") setStep("pin-login");
      if (otp.code === "ACCOUNT_REQUIRED") {
        // keep error; show create account link via error + secondary CTA
      }
      return;
    }
    if (otp.phoneLocal) {
      setPhone(
        String(otp.phoneLocal).replace(/\D/g, "").slice(0, NG_LOCAL_MAX_DIGITS)
      );
    }
    if (otp.emailHint) setEmailHint(otp.emailHint);
    setChannelHint(otp.channelHint || null);
    setCode("");
    if (!as2faFallback && mode === "phone") setEmailHint(otp.emailHint || null);
    setOtpSource(as2faFallback ? "2fa-fallback" : "login");
    startOtpCountdown(otp.expiresInSec);
    setStep(as2faFallback ? "otp" : "otp");
  }

  function verifyOtp() {
    void runBusy("verifyOtp", async () => {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: mode === "phone" || googleState === "phone" ? phone : undefined,
          email: mode === "email" ? email.trim() : undefined,
          code,
          referral: params.get("ref") || undefined,
          googleLink: googleState === "phone",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Incorrect code");
        if (data.code === "2FA_FIRST_FACTOR_REQUIRED") {
          setStep("pin-login");
          setPin("");
        }
        if (data.code === "ACCOUNT_REQUIRED") {
          // show signup
        }
        return;
      }
      if (data.needsPinSetup) {
        setPin("");
        setPinConfirm("");
        setStep("pin-setup");
        return;
      }
      goDashboard();
    });
  }

  function loginWithPin() {
    void runBusy("pinLogin", async () => {
      const res = await fetch("/api/auth/pin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "email"
            ? { email: email.trim(), pin }
            : { phone, pin }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Incorrect PIN");
        if (data.code === "PIN_REQUIRED") {
          void runBusy("sendOtp", async () => {
            await sendOtpRequest({});
          });
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
              "Email code could not be sent. Tap “Use phone OTP instead”."
          );
          clearOtpCountdown();
        } else {
          startOtpCountdown(data.expiresInSec);
        }
        setStep("login-2fa");
        return;
      }
      goDashboard();
    });
  }

  function verifyLogin2fa() {
    void runBusy("verify2fa", async () => {
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
        setError(data.error || "Incorrect code");
        if (data.code === "2FA_EXPIRED") {
          setStep("identify");
          setPin("");
          setCode("");
          clearOtpCountdown();
        }
        return;
      }
      if (data.needsPinSetup) {
        setStep("pin-setup");
        return;
      }
      goDashboard();
    });
  }

  function requestOtp(opts: { resend?: boolean } = {}) {
    void runBusy(opts.resend ? "resendOtp" : "sendOtp", async () => {
      await sendOtpRequest(opts);
    });
  }

  function forgotPinWithOtp() {
    if (email2faOn) {
      setError(
        "Email 2FA is on. Enter your PIN, then the email code. To reset PIN, sign in first then use Settings."
      );
      return;
    }
    requestOtp({});
  }

  function savePinAndEnter() {
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
      goDashboard();
    });
  }

  const anyBusy = busy !== null;
  const otpSendBusy = busy === "sendOtp" || busy === "resendOtp";
  const showNoAccount =
    error &&
    (error.toLowerCase().includes("no account") ||
      error.toLowerCase().includes("create an account"));

  const railIndex =
    step === "identify"
      ? 0
      : step === "otp" || step === "login-2fa"
        ? 1
        : 2;

  const form = (
    <form
      className="flex flex-col gap-4 sm:gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "identify") continueIdentify();
        else if (step === "otp") verifyOtp();
        else if (step === "login-2fa") verifyLogin2fa();
        else if (step === "pin-login") loginWithPin();
        else if (step === "pin-setup") {
          if (pin.length === 4) {
            setPinConfirm("");
            setStep("pin-confirm");
          }
        } else if (step === "pin-confirm") savePinAndEnter();
      }}
    >
      <AuthStepTransition stepKey={step}>
      <div className="flex flex-col gap-4 sm:gap-5">
      {step === "identify" && (
        <>
          {googleNotice && (
            <AuthNotice
              tone={googleState === "phone" ? "success" : "danger"}
            >
              {googleNotice}
            </AuthNotice>
          )}

          {googleState !== "phone" && (
            <>
              <GoogleAuthButton href={googleHref} />
              <AuthOrDivider label="Or sign in" />
              <IdentifierToggle
                value={mode}
                disabled={anyBusy}
                onChange={(m) => {
                  setMode(m);
                  setError(null);
                }}
              />
            </>
          )}

          {mode === "phone" || googleState === "phone" ? (
            <DigitField
              label="Phone number"
              length={NG_LOCAL_MAX_DIGITS}
              value={phone}
              onChange={(v) => setPhone(sanitizeNgPhoneInput(v))}
              inputMode="tel"
              variant="field"
              autoFocus
              aria-label="Nigerian phone number"
              hint="11-digit Nigerian mobile"
            />
          ) : (
            <Input
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              value={email}
              maxLength={120}
              placeholder="you@example.com"
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              disabled={anyBusy}
            />
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={
              anyBusy ||
              (mode === "phone" || googleState === "phone"
                ? phone.length < NG_LOCAL_MAX_DIGITS
                : !emailLooksValid)
            }
          >
            {busy === "lookup"
              ? "Checking…"
              : busy === "sendOtp"
                ? "Sending code…"
                : "Continue"}
          </Button>

          {showNoAccount && (
            <Link
              href={signupHref()}
              className="pressable flex min-h-12 w-full items-center justify-center rounded-2xl border border-green/25 bg-green/[0.07] text-[14px] font-semibold text-green"
            >
              Create account
            </Link>
          )}

          {googleState !== "phone" && (
            <p className="text-center text-[13px] leading-relaxed text-ink/50">
              New here?{" "}
              <Link
                href={signupHref()}
                className="font-semibold text-green hover:underline"
              >
                Create account
              </Link>
            </p>
          )}
        </>
      )}

      {step === "otp" && (
        <>
          <DigitField
            label={mode === "email" ? "Email code" : "OTP code"}
            length={OTP_LENGTH}
            value={code}
            onChange={setCode}
            autoFocus
            disabled={busy === "verifyOtp"}
            hint={
              otpSendBusy
                ? "Sending code…"
                : channelHint === "email" || mode === "email"
                  ? `Sent to ${emailHint || email}`
                  : channelHint
                    ? `Sent via ${channelHint} to ${local || phone}`
                    : `Sent to ${local || phone}`
            }
            aria-label="One-time password"
          />
          <OtpExpiryBanner
            remainingSec={otpRemainingSec}
            active={Boolean(otpExpiresAt)}
          />
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={
              anyBusy || code.length < OTP_LENGTH || otpRemainingSec <= 0
            }
          >
            {busy === "verifyOtp"
              ? "Verifying code…"
              : otpRemainingSec <= 0
                ? "Code expired"
                : "Continue"}
          </Button>
          <div className="-mx-0.5 flex flex-col gap-0.5">
            <AuthTextAction
              disabled={anyBusy || cooldown > 0}
              onClick={() => requestOtp({ resend: true })}
            >
              {otpSendBusy
                ? "Sending…"
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend code"}
            </AuthTextAction>
            <AuthTextAction
              tone="muted"
              disabled={anyBusy}
              onClick={() => {
                setStep(
                  otpSource === "2fa-fallback" ? "login-2fa" : "identify"
                );
                setCode("");
                setError(null);
                clearOtpCountdown();
              }}
            >
              {otpSource === "2fa-fallback"
                ? "Back to email code"
                : "Change account"}
            </AuthTextAction>
          </div>
        </>
      )}

      {step === "login-2fa" && (
        <>
          <DigitField
            label="Email code"
            length={OTP_LENGTH}
            value={code}
            onChange={setCode}
            autoFocus
            disabled={busy === "verify2fa"}
            hint={
              emailHint
                ? `Sent to ${emailHint}`
                : `Enter the ${OTP_LENGTH}-digit code from your email`
            }
            aria-label="Email two-factor code"
          />
          <OtpExpiryBanner
            remainingSec={otpRemainingSec}
            active={Boolean(otpExpiresAt)}
          />
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={
              anyBusy || code.length < OTP_LENGTH || otpRemainingSec <= 0
            }
          >
            {busy === "verify2fa"
              ? "Signing you in…"
              : otpRemainingSec <= 0
                ? "Code expired"
                : "Complete sign-in"}
          </Button>
          <div className="flex flex-col gap-0.5">
            <AuthTextAction
              disabled={anyBusy}
              onClick={() => {
                setOtpSource("2fa-fallback");
                requestOtp({});
              }}
            >
              {busy === "sendOtp"
                ? "Sending phone code…"
                : "Use phone OTP instead"}
            </AuthTextAction>
            <AuthTextAction
              tone="muted"
              disabled={anyBusy}
              onClick={() => {
                setStep("identify");
                setCode("");
                setError(null);
                clearOtpCountdown();
              }}
            >
              Start over
            </AuthTextAction>
          </div>
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
            disabled={busy === "pinLogin"}
            hint={
              mode === "email"
                ? `For ${emailHint || email}`
                : `For ${local || phone}`
            }
            aria-label="Login PIN"
          />
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={anyBusy || pin.length < 4}
          >
            {busy === "pinLogin" ? "Signing in…" : "Enter the grid"}
          </Button>
          {!email2faOn && (
            <AuthTextAction disabled={anyBusy} onClick={forgotPinWithOtp}>
              {otpSendBusy ? "Sending code…" : "Forgot PIN? Use OTP"}
            </AuthTextAction>
          )}
          {email2faOn && (
            <p className="text-center text-[12px] leading-relaxed text-ink/45">
              Email 2FA is on — enter your PIN, then the email code.
            </p>
          )}
          <AuthTextAction
            tone="quiet"
            disabled={anyBusy}
            onClick={() => {
              setStep("identify");
              setPin("");
              setError(null);
            }}
          >
            Change account
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
              setError(null);
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
      brandKicker="ACCESS CONTROL"
      brandTitle={
        <>
          ENTER
          <br />
          THE GRID.
        </>
      }
      brandBody="Sign in with phone or email. New wallets start on Create account — we verify both your line and inbox before you spend."
      brandPoints={[
        "Phone or email — same secure PIN",
        "WhatsApp / SMS OTP when you need it",
        "Optional email two-factor for extra lock",
      ]}
      rail={
        <AuthProgressRail
          steps={["Account", "Verify", "Secure"]}
          activeIndex={railIndex}
        />
      }
      footerNote={<AuthLegalFooter />}
    >
      {form}
    </AuthShell>
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

function googleMessage(state: string | null) {
  switch (state) {
    case "phone":
      return "Google account verified. Add your Nigerian line once, then confirm the OTP to finish linking.";
    case "2fa":
      return "Google verified. Enter the email code we just sent to finish two-factor sign-in.";
    case "cancelled":
      return "Google sign-in was cancelled. You can try again or continue with phone or email.";
    case "expired":
      return "Google sign-in could not complete (session cookies missing). Allow cookies for this site, use one tab only, and try Continue with Google again.";
    case "mismatch":
      return "This Google sign-in no longer matches the original request. Close extra tabs and try Continue with Google once more.";
    case "invalid":
      return "That Google sign-in request could not be verified. Please try again.";
    case "suspended":
      return "This DataGrid account is suspended. Contact support for help.";
    case "config":
      return "Google sign-in is not configured yet. Continue with your phone or email for now.";
    case "unavailable":
      return "Google sign-in is temporarily unavailable. Please try again or use phone/email.";
    case "session":
      return "Google verified you, but we could not open your DataGrid session (cookie blocked or expired). Allow cookies, then try Continue with Google again.";
    default:
      return null;
  }
}


