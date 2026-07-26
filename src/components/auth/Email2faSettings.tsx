"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/**
 * Login email 2FA (stored as User.totpEnabled).
 * When on, every sign-in requires a branded email code after PIN/Google.
 */
export function Email2faSettings({
  enabled: initial,
  email: emailProp,
}: {
  enabled: boolean;
  email: string | null;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [email, setEmail] = useState(emailProp);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setEnabled(initial);
    setEmail(emailProp);
  }, [initial, emailProp]);

  const hasEmail = Boolean(email?.includes("@"));

  function set2fa(next: boolean) {
    start(async () => {
      setError(null);
      setMessage(null);

      // Re-check email from server — settings cache can lag behind a just-saved email.
      if (next) {
        const check = await fetch("/api/auth/2fa", { method: "GET" })
          .then((r) => r.json())
          .catch(() => ({}));
        if (check.email) setEmail(check.email);
        if (!check.email && !hasEmail) {
          setError(
            "Add and verify an email under Personal details first, then enable 2FA."
          );
          return;
        }
      }

      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not update 2FA.");
        return;
      }
      setEnabled(Boolean(data.enabled));
      if (data.email) setEmail(data.email);
      setMessage(
        data.enabled
          ? "Email 2FA is on. You’ll get a code by email each time you sign in."
          : "Email 2FA is off. PIN alone is enough to sign in."
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Email two-factor (2FA)</p>
          <p className="mt-1 text-xs leading-relaxed text-ink/55">
            After your PIN (or Google sign-in), we email a one-time code to{" "}
            {hasEmail ? (
              <span className="font-mono-num text-ink/70">{email}</span>
            ) : (
              <span className="text-danger">no email on file</span>
            )}
            .
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={pending || (!hasEmail && !enabled)}
          onClick={() => set2fa(!enabled)}
          className={cn(
            "relative h-8 w-14 shrink-0 rounded-full transition pressable",
            enabled ? "bg-green" : "bg-ink/15",
            (pending || (!hasEmail && !enabled)) && "opacity-50"
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
              enabled ? "left-7" : "left-1"
            )}
          />
        </button>
      </div>
      {!hasEmail && (
        <p className="text-xs text-amber">
          Verify an email under Personal details (code to inbox), then enable 2FA.
          If you just saved one, wait a moment or refresh.
        </p>
      )}
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
      {enabled && hasEmail && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => set2fa(false)}
        >
          Turn off email 2FA
        </Button>
      )}
    </div>
  );
}
