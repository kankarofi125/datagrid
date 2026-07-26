import "server-only";

import type { IronSession } from "iron-session";
import { OTP_TTL_SECONDS, requestOtp } from "@/lib/auth/otp";
import {
  PENDING_2FA_SESSION_MS,
} from "@/lib/auth/resolve-account-phone";
import type { SessionData } from "@/lib/auth/session";

export type Login2faUser = {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: string;
  totpEnabled: boolean;
  googleSub?: string | null;
};

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!domain) return "***";
  if (localPart.length <= 2) return `*@${domain}`;
  return `${localPart[0]}***@${domain}`;
}

/**
 * Park pendingLogin2fa so the user can finish with email code OR phone OTP.
 * Always stores userId + phone + email from the User account (DB truth).
 * Session TTL is 20 minutes — independent of the 2-minute OTP code lifetime.
 */
export async function parkPending2fa(
  session: IronSession<SessionData>,
  user: Login2faUser,
  email: string,
  opts?: { googleSub?: string | null; ttlMs?: number }
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
    googleSub: opts?.googleSub || user.googleSub || undefined,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + (opts?.ttlMs ?? PENDING_2FA_SESSION_MS),
  };
  await session.save();
}

/**
 * Start email 2FA after PIN or Google verified the first factor.
 * Always parks pendingLogin2fa (with phone) so "Use OTP instead" can resolve
 * the line from the User row even if Brevo fails or the email code expires.
 */
export async function startEmail2faChallenge(
  session: IronSession<SessionData>,
  user: Login2faUser,
  opts?: { emailOverride?: string; firstName?: string; googleSub?: string | null }
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

  // Park identity for 20 minutes (phone OTP fallback must outlive 2‑min codes).
  await parkPending2fa(session, user, email, {
    googleSub: opts?.googleSub || user.googleSub,
    ttlMs: PENDING_2FA_SESSION_MS,
  });

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

  // IMPORTANT: do NOT shrink pendingLogin2fa.expiresAt to the OTP code TTL.
  // Code expiry is tracked on OtpChallenge; identity stays for phone fallback.
  console.info("[login-2fa] challenge started", {
    userId: user.id,
    emailHint,
    delivered: otp.channels,
    expiresInSec,
    sessionMs: PENDING_2FA_SESSION_MS,
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
