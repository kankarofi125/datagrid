import "server-only";

import { prisma } from "@/lib/db";
import type { SessionData } from "@/lib/auth/session";

/**
 * How long a Google/PIN 2FA session stays usable for phone OTP fallback.
 * Separate from the 2-minute OTP *code* lifetime.
 */
export const PENDING_2FA_SESSION_MS = 20 * 60 * 1000;

/** Allow resolving phone a bit after session expiry (slow user / clock skew). */
const IDENTITY_GRACE_MS = 10 * 60 * 1000;

export type ResolvedAccountPhone = {
  phone: string;
  userId: string;
  email: string | null;
  source: string;
};

/**
 * Resolve the account phone for "Use OTP instead" after Google / email 2FA.
 *
 * Source of truth is the User row (phone is always on the account), not the
 * client form. Session only proves the user already passed Google or PIN.
 *
 * Lookup order:
 *  1. pendingLogin2fa.userId → User.phone
 *  2. pendingLogin2fa.phone (cached)
 *  3. pendingLogin2fa.email / pendingGoogle.email → User by email
 *  4. pendingGoogle.sub → User.googleSub
 */
export async function resolveAccountPhoneFromSession(
  session: SessionData,
  opts?: { clientPhone?: string }
): Promise<
  | { ok: true; result: ResolvedAccountPhone }
  | { ok: false; error: string; code?: string }
> {
  const client = (opts?.clientPhone || "").trim();
  if (client) {
    return {
      ok: true,
      result: {
        phone: client,
        userId: session.pendingLogin2fa?.userId || "",
        email: session.pendingLogin2fa?.email || null,
        source: "client",
      },
    };
  }

  const now = Date.now();
  const pending2fa = session.pendingLogin2fa || null;
  const pendingGoogle = session.pendingGoogle || null;

  const pending2faUsable =
    pending2fa &&
    pending2fa.expiresAt + IDENTITY_GRACE_MS > now;

  const pendingGoogleUsable =
    pendingGoogle &&
    pendingGoogle.expiresAt + IDENTITY_GRACE_MS > now;

  // 1) Authoritative: load User by parked userId (Google/PIN already verified).
  if (pending2faUsable && pending2fa.userId) {
    const user = await prisma.user.findUnique({
      where: { id: pending2fa.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        isActive: true,
      },
    });
    if (user?.isActive && user.phone?.trim()) {
      return {
        ok: true,
        result: {
          phone: user.phone.trim(),
          userId: user.id,
          email: user.email,
          source: "userId",
        },
      };
    }
  }

  // 2) Cached phone on session (should match DB).
  if (pending2faUsable && pending2fa.phone?.trim()) {
    return {
      ok: true,
      result: {
        phone: pending2fa.phone.trim(),
        userId: pending2fa.userId,
        email: pending2fa.email || null,
        source: "pendingLogin2fa.phone",
      },
    };
  }

  // 3) Email → User (same DataGrid account).
  const emails: string[] = [];
  if (pending2faUsable && pending2fa.email) emails.push(pending2fa.email);
  if (pendingGoogleUsable && pendingGoogle.email) {
    emails.push(pendingGoogle.email);
  }

  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email.includes("@")) continue;

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        isActive: true,
      },
      select: { id: true, phone: true, email: true },
    });

    if (user?.phone?.trim()) {
      return {
        ok: true,
        result: {
          phone: user.phone.trim(),
          userId: user.id,
          email: user.email,
          source: "email",
        },
      };
    }
  }

  // 4) Google subject → User.googleSub
  if (pendingGoogleUsable && pendingGoogle.sub) {
    const user = await prisma.user.findUnique({
      where: { googleSub: pendingGoogle.sub },
      select: { id: true, phone: true, email: true, isActive: true },
    });
    if (user?.isActive && user.phone?.trim()) {
      return {
        ok: true,
        result: {
          phone: user.phone.trim(),
          userId: user.id,
          email: user.email,
          source: "googleSub",
        },
      };
    }
  }

  const hadPending = Boolean(pending2fa || pendingGoogle);
  const expiredOnly =
    (pending2fa && pending2fa.expiresAt + IDENTITY_GRACE_MS <= now) ||
    (pendingGoogle && pendingGoogle.expiresAt + IDENTITY_GRACE_MS <= now);

  if (!hadPending || expiredOnly) {
    return {
      ok: false,
      code: "SESSION_EXPIRED",
      error:
        "Your sign-in session expired. Continue with Google again, or enter your phone number.",
    };
  }

  return {
    ok: false,
    code: "NO_PHONE",
    error:
      "We could not find a phone on this account. Enter your line on the login form, or contact support.",
  };
}
