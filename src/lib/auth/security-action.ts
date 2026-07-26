import "server-only";

import type { IronSession } from "iron-session";
import type { SessionData } from "@/lib/auth/session";

export type SecurityPurpose = "pin_change" | "email_change";

/** Time allowed to enter OTP after send. */
export const SECURITY_OTP_WINDOW_MS = 2 * 60 * 1000;

/** Time allowed to finish the action after OTP is verified. */
export const SECURITY_ACTION_WINDOW_MS = 10 * 60 * 1000;

export function maskDestination(value: string, kind: "email" | "phone"): string {
  if (kind === "email") {
    const [local, domain] = value.split("@");
    if (!domain) return "***";
    if (local.length <= 2) return `*@${domain}`;
    return `${local[0]}***@${domain}`;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `••••${digits.slice(-4)}`;
}

export function getPendingSecurity(
  session: IronSession<SessionData> | SessionData,
  purpose: SecurityPurpose
) {
  const pending = session.pendingSecurity;
  if (!pending) return null;
  if (pending.purpose !== purpose) return null;
  if (pending.expiresAt <= Date.now()) return null;
  return pending;
}

export async function parkSecurityOtp(
  session: IronSession<SessionData>,
  input: {
    purpose: SecurityPurpose;
    userId: string;
    targetEmail?: string;
    destinationHint: string;
  }
) {
  session.pendingSecurity = {
    purpose: input.purpose,
    userId: input.userId,
    targetEmail: input.targetEmail,
    destinationHint: input.destinationHint,
    verified: false,
    expiresAt: Date.now() + SECURITY_OTP_WINDOW_MS,
  };
  await session.save();
}

export async function markSecurityVerified(
  session: IronSession<SessionData>,
  purpose: SecurityPurpose
) {
  const pending = getPendingSecurity(session, purpose);
  if (!pending) return false;
  session.pendingSecurity = {
    ...pending,
    verified: true,
    expiresAt: Date.now() + SECURITY_ACTION_WINDOW_MS,
  };
  await session.save();
  return true;
}

export async function consumeSecurityAction(
  session: IronSession<SessionData>,
  purpose: SecurityPurpose
) {
  const pending = getPendingSecurity(session, purpose);
  if (!pending?.verified) return false;
  delete session.pendingSecurity;
  await session.save();
  return true;
}

export function requireVerifiedSecurity(
  session: IronSession<SessionData> | SessionData,
  purpose: SecurityPurpose,
  opts?: { targetEmail?: string }
): { ok: true } | { ok: false; error: string } {
  const pending = getPendingSecurity(session, purpose);
  if (!pending) {
    return {
      ok: false,
      error: "Verification expired. Request a new code and try again.",
    };
  }
  if (!pending.verified) {
    return {
      ok: false,
      error: "Enter the verification code before continuing.",
    };
  }
  if (
    purpose === "email_change" &&
    opts?.targetEmail &&
    pending.targetEmail &&
    pending.targetEmail !== opts.targetEmail.trim().toLowerCase()
  ) {
    return {
      ok: false,
      error: "Email does not match the address we verified. Start again.",
    };
  }
  return { ok: true };
}
