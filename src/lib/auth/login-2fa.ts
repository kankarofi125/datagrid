import "server-only";

import type { IronSession } from "iron-session";
import { OTP_TTL_MS, OTP_TTL_SECONDS, requestOtp } from "@/lib/auth/otp";
import type { SessionData } from "@/lib/auth/session";

export type Login2faUser = {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: string;
  totpEnabled: boolean;
};

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!domain) return "***";
  if (localPart.length <= 2) return `*@${domain}`;
  return `${localPart[0]}***@${domain}`;
}

/**
 * Park pendingLogin2fa so the user can finish with email code OR phone OTP.
 * Phone is always stored for "Use OTP instead" (resolved again by email if needed).
 */
async function parkPending2fa(
  session: IronSession<SessionData>,
  user: Login2faUser,
  email: string,
  ttlMs: number
) {
  session.isLoggedIn = false;
  delete session.userId;
  delete session.phone;
  delete session.role;
  delete session.adminUsername;
  delete session.pendingGoogle;
  session.pendingLogin2fa = {
    userId: user.id,
    phone: user.phone,
    email,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + ttlMs,
  };
  await session.save();
}

/**
 * Start email 2FA after PIN or Google verified the first factor.
 * Always parks pendingLogin2fa (with phone) so "Use OTP instead" can resolve
 * the line from the verified Google/PIN identity even if Brevo fails.
 */
export async function startEmail2faChallenge(
  session: IronSession<SessionData>,
  user: Login2faUser,
  opts?: { emailOverride?: string; firstName?: string }
): Promise<
  | {
      ok: true;
      emailHint: string;
      email: string;
      expiresInSec: number;
      phoneFallback: true;
    }
  | {
      ok: false;
      error: string;
      /** Session parked — client can offer phone OTP via WhatsApp/SMS. */
      phoneFallback?: true;
      emailHint?: string;
      email?: string;
      expiresInSec?: number;
    }
> {
  const email = (opts?.emailOverride || user.email || "").trim().toLowerCase();
  if (!user.totpEnabled) {
    return { ok: false, error: "2FA is not enabled for this account" };
  }
  if (!email || !email.includes("@")) {
    return {
      ok: false,
      error: "Add an email on your profile to use email 2FA.",
    };
  }
  if (!user.phone?.trim()) {
    return {
      ok: false,
      error: "No phone number on this account. Contact support.",
    };
  }

  // Park first so "Use OTP instead" works even when email delivery fails.
  // Give a longer window than a single OTP when email may not arrive.
  const fallbackTtlMs = Math.max(OTP_TTL_MS, 10 * 60 * 1000);
  await parkPending2fa(session, user, email, fallbackTtlMs);

  const emailHint = maskEmail(email);

  const otp = await requestOtp({
    email,
    channels: "email",
    firstName:
      opts?.firstName ||
      user.name?.split(" ")[0] ||
      "Customer",
    skipCooldown: true,
  });

  if (!otp.ok) {
    console.error("[login-2fa] email send failed", otp.error);
    // Keep pendingLogin2fa so Google/PIN users can fall back to phone OTP.
    return {
      ok: false,
      error: otp.error,
      phoneFallback: true,
      emailHint,
      email,
      expiresInSec: OTP_TTL_SECONDS,
    };
  }

  const expiresInSec =
    "expiresInSec" in otp && typeof otp.expiresInSec === "number"
      ? otp.expiresInSec
      : OTP_TTL_SECONDS;

  // Align pending window with the code that was actually sent.
  session.pendingLogin2fa = {
    userId: user.id,
    phone: user.phone,
    email,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
  await session.save();

  console.info("[login-2fa] challenge started", {
    userId: user.id,
    emailHint,
    delivered: otp.channels,
    expiresInSec,
    realEmail:
      otp.channels.includes("email") && !otp.channels.includes("email-dev"),
  });

  return {
    ok: true,
    emailHint,
    email,
    expiresInSec,
    phoneFallback: true,
  };
}

export function email2faLoginPath(result: {
  emailHint: string;
  source?: "google" | "pin";
  emailFailed?: boolean;
}): string {
  const qs = new URLSearchParams({
    google: "2fa",
    emailHint: result.emailHint,
  });
  if (result.source === "pin") {
    qs.set("login", "2fa");
  }
  if (result.emailFailed) {
    qs.set("emailFailed", "1");
  }
  return `/login?${qs.toString()}`;
}
