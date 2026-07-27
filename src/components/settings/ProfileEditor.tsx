"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import {
  SecurityOtpStep,
  SecurityStepRail,
} from "@/components/auth/SecurityOtpStep";

type EmailStep = "idle" | "otp" | "done";

export function ProfileEditor({
  initialName,
  initialEmail,
  /** Lighter chrome when rendered inside a mobile bottom sheet */
  embedded = false,
}: {
  initialName: string;
  initialEmail: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  /** Ignore stale server props briefly after a successful local save. */
  const [localSaveAt, setLocalSaveAt] = useState(0);

  useEffect(() => {
    // Don't clobber a fresher local save with stale cached RSC props.
    if (localSaveAt && Date.now() - localSaveAt < 15_000) return;
    setName(initialName);
    setSavedName(initialName);
    setEmail(initialEmail);
    setSavedEmail(initialEmail);
  }, [initialName, initialEmail, localSaveAt]);

  const [emailStep, setEmailStep] = useState<EmailStep>("idle");
  const [destinationHint, setDestinationHint] = useState<string | null>(null);
  const [expiresInSec, setExpiresInSec] = useState(120);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameChanged = name.trim() !== savedName;
  const emailChanged =
    email.trim().toLowerCase() !== (savedEmail || "").toLowerCase();
  const emailLooksValid =
    !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  function saveNameOnly() {
    startTransition(async () => {
      setMessage(null);
      setError(null);
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not update your name.");
        return;
      }
      setSavedName(name.trim());
      setLocalSaveAt(Date.now());
      setMessage("Name updated.");
      router.refresh();
    });
  }

  function startEmailVerify() {
    startTransition(async () => {
      setMessage(null);
      setError(null);
      if (!email.trim()) {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "" }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error || "Could not remove email.");
          return;
        }
        setSavedEmail("");
        setLocalSaveAt(Date.now());
        setMessage("Email removed. Email 2FA was turned off if it was on.");
        router.refresh();
        return;
      }
      if (!emailLooksValid) {
        setError("Enter a valid email address.");
        return;
      }

      const res = await fetch("/api/security/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "email_change",
          email: email.trim().toLowerCase(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send verification code");
        return;
      }
      setDestinationHint(data.destinationHint || null);
      setExpiresInSec(data.expiresInSec || 120);
      setEmailStep("otp");
    });
  }

  async function resendEmailOtp() {
    const res = await fetch("/api/security/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: "email_change",
        email: email.trim().toLowerCase(),
        resend: true,
      }),
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

  /**
   * Verify OTP — server also persists the email (atomic).
   * Returns success only when saved (or verified for legacy retry).
   */
  async function verifyEmailOtp(code: string) {
    const res = await fetch("/api/security/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "email_change", code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Code OK but DB save failed — try one PATCH recovery.
      if (data.code === "SAVE_FAILED" && data.targetEmail) {
        const patch = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.targetEmail }),
        });
        const patchData = await patch.json().catch(() => ({}));
        if (patch.ok) {
          const saved = String(patchData.user?.email || data.targetEmail);
          setSavedEmail(saved);
          setEmail(saved);
          setLocalSaveAt(Date.now());
          setEmailStep("done");
          setMessage("Email verified and saved. You can enable email 2FA now.");
          router.refresh();
          window.setTimeout(() => setEmailStep("idle"), 2000);
          return { ok: true as const };
        }
      }
      return { ok: false as const, error: data.error || "Incorrect code" };
    }

    if (data.saved && data.email) {
      const saved = String(data.email).toLowerCase();
      setSavedEmail(saved);
      setEmail(saved);
      setLocalSaveAt(Date.now());
      setEmailStep("done");
      setMessage(
        data.message ||
          "Email verified and saved. You can enable email 2FA now."
      );
      router.refresh();
      window.setTimeout(() => setEmailStep("idle"), 2500);
      return { ok: true as const };
    }

    // Fallback: verified but not auto-saved (pin path style) — PATCH.
    const patch = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const patchData = await patch.json().catch(() => ({}));
    if (!patch.ok) {
      return {
        ok: false as const,
        error: patchData.error || "Could not save email after verification",
      };
    }
    const saved = String(patchData.user?.email || email).toLowerCase();
    setSavedEmail(saved);
    setEmail(saved);
    setLocalSaveAt(Date.now());
    setEmailStep("done");
    setMessage("Email verified and saved. You can enable email 2FA now.");
    router.refresh();
    window.setTimeout(() => setEmailStep("idle"), 2500);
    return { ok: true as const };
  }

  return (
    <Card className={embedded ? "border-0 bg-transparent p-0 shadow-none" : "p-4 lg:p-6"}>
      {!embedded && (
        <CardHeading
          kicker="Personal details"
          title="How we address you"
          className="mb-4"
        />
      )}

      <div className="space-y-5">
        <div className="space-y-3">
          <Input
            name="name"
            label="Full name"
            autoComplete="name"
            value={name}
            maxLength={70}
            placeholder="Add your full name"
            onChange={(event) => setName(event.target.value)}
            disabled={emailStep === "otp"}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!nameChanged || pending || emailStep === "otp"}
            onClick={saveNameOnly}
          >
            {pending && !emailChanged ? "Saving…" : "Save name"}
          </Button>
        </div>

        <div className="border-t border-line pt-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Email address</p>
              <p className="mt-1 text-xs leading-relaxed text-ink/55">
                Used for receipts, recovery, and login 2FA. Adding or changing
                it requires a code sent to that inbox.
              </p>
            </div>
            {savedEmail && emailStep === "idle" && (
              <span className="shrink-0 rounded-full bg-green/10 px-2 py-0.5 font-mono-num text-[9px] font-semibold text-green">
                ON FILE
              </span>
            )}
          </div>

          {emailStep === "otp" && (
            <div className="mb-4">
              <SecurityStepRail
                steps={["Email", "Verify", "Saved"]}
                activeIndex={1}
              />
            </div>
          )}

          {emailStep !== "otp" ? (
            <div className="space-y-3">
              <Input
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                value={email}
                maxLength={120}
                placeholder="you@example.com"
                hint={
                  savedEmail
                    ? `Saved on account: ${savedEmail}`
                    : "No email on file yet — verify to save"
                }
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button
                type="button"
                fullWidth
                disabled={!emailChanged || pending || !emailLooksValid}
                onClick={startEmailVerify}
              >
                {pending
                  ? "Working…"
                  : !email.trim() && savedEmail
                    ? "Remove email"
                    : savedEmail
                      ? "Verify & update email"
                      : "Verify & add email"}
              </Button>
            </div>
          ) : (
            <SecurityOtpStep
              title="Confirm your email"
              description="We emailed a 6-digit code. Enter it to save this address on your account."
              destinationHint={destinationHint}
              initialExpiresInSec={expiresInSec}
              onVerified={() => {
                // Save already happened inside verifyEmailOtp when ok.
              }}
              onCancel={() => {
                setEmailStep("idle");
                setError(null);
              }}
              onResend={resendEmailOtp}
              onVerify={verifyEmailOtp}
            />
          )}
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-green" role="status">
            {message}
          </p>
        )}
      </div>
    </Card>
  );
}
