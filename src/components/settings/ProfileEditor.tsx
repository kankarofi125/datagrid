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
}: {
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [savedEmail, setSavedEmail] = useState(initialEmail);

  useEffect(() => {
    setName(initialName);
    setSavedName(initialName);
    setEmail(initialEmail);
    setSavedEmail(initialEmail);
  }, [initialName, initialEmail]);
  const [emailStep, setEmailStep] = useState<EmailStep>("idle");
  const [destinationHint, setDestinationHint] = useState<string | null>(null);
  const [expiresInSec, setExpiresInSec] = useState(120);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameChanged = name.trim() !== savedName;
  // Compare against last saved email on server (updates after verify).
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
      setMessage("Name updated.");
      router.refresh();
    });
  }

  function startEmailVerify() {
    startTransition(async () => {
      setMessage(null);
      setError(null);
      if (!email.trim()) {
        // Clearing email — no OTP
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
        body: JSON.stringify({ purpose: "email_change", email: email.trim() }),
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
        email: email.trim(),
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

  async function verifyEmailOtp(code: string) {
    const res = await fetch("/api/security/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "email_change", code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false as const, error: data.error || "Incorrect code" };
    }
    return { ok: true as const };
  }

  function commitEmail() {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not save email.");
        if (data.code === "OTP_REQUIRED") setEmailStep("otp");
        return;
      }
      setSavedEmail(email.trim().toLowerCase());
      setEmailStep("done");
      setMessage(
        data.emailVerified
          ? "Email verified and saved. You can enable email 2FA in Security."
          : "Profile updated."
      );
      router.refresh();
      window.setTimeout(() => setEmailStep("idle"), 2000);
    });
  }

  return (
    <Card className="p-4 lg:p-6">
      <CardHeading
        kicker="Personal details"
        title="How we address you"
        className="mb-4"
      />

      <div className="space-y-5">
        {/* Name — no OTP */}
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
              <SecurityStepRail steps={["Email", "Verify", "Save"]} activeIndex={1} />
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
                    ? `Current: ${savedEmail}`
                    : "No email on file yet"
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
              description="We emailed a 4-digit code to the new address. Enter it to prove you own this inbox."
              destinationHint={destinationHint}
              initialExpiresInSec={expiresInSec}
              onVerified={commitEmail}
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
