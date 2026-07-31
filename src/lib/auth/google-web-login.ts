import "server-only";

import type { IronSession } from "iron-session";
import {
  getGoogleAudiences,
  type GoogleIdentity,
  verifyGoogleIdToken,
} from "@/lib/auth/google";
import { startEmail2faChallenge } from "@/lib/auth/login-2fa";
import { markSessionLogin, type SessionData } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export type GoogleWebLoginResult =
  | {
      ok: true;
      status: "logged_in";
      needsPinSetup: boolean;
      redirectTo: string;
    }
  | {
      ok: true;
      status: "needs_2fa";
      emailHint: string;
      emailFailed: boolean;
      redirectTo: string;
    }
  | {
      ok: true;
      status: "needs_signup";
      email: string;
      name: string | null;
      redirectTo: string;
    }
  | {
      ok: false;
      error: string;
      code:
        | "ID_TOKEN_REQUIRED"
        | "GOOGLE_CONFIG"
        | "GOOGLE_INVALID"
        | "SUSPENDED"
        | "GOOGLE_MISMATCH"
        | "UNAVAILABLE";
      statusCode: number;
    };

/**
 * Shared resolver for browser Google One Tap / GIS credential responses.
 * Mutates and saves the iron-session (login, 2FA park, or pendingGoogle).
 */
export async function completeGoogleWebLogin(
  session: IronSession<SessionData>,
  idTokenRaw: string
): Promise<GoogleWebLoginResult> {
  const idToken = String(idTokenRaw || "").trim();
  if (!idToken) {
    return {
      ok: false,
      error: "Google credential missing.",
      code: "ID_TOKEN_REQUIRED",
      statusCode: 400,
    };
  }

  const audiences = getGoogleAudiences();
  if (audiences.length === 0) {
    return {
      ok: false,
      error: "Google Sign-In is not configured.",
      code: "GOOGLE_CONFIG",
      statusCode: 503,
    };
  }

  let identity: GoogleIdentity;
  try {
    identity = await verifyGoogleIdToken({
      idToken,
      audiences,
      requireNonce: false,
    });
  } catch (err) {
    console.warn(
      "[auth/google-web] verify failed",
      err instanceof Error ? err.message : err
    );
    return {
      ok: false,
      error: "Could not verify Google account. Try again.",
      code: "GOOGLE_INVALID",
      statusCode: 401,
    };
  }

  const bySub = await prisma.user.findUnique({
    where: { googleSub: identity.sub },
  });
  const byEmail =
    bySub ||
    (await prisma.user.findFirst({
      where: { email: { equals: identity.email, mode: "insensitive" } },
    }));

  // --- New Google identity → signup with phone proof ---
  if (!byEmail) {
    session.pendingGoogle = {
      sub: identity.sub,
      email: identity.email,
      name: identity.name,
      picture: identity.picture,
      expiresAt: Date.now() + 20 * 60 * 1000,
    };
    session.isLoggedIn = false;
    delete session.userId;
    delete session.pendingLogin2fa;
    delete session.pendingSignup;
    await session.save();

    const qs = new URLSearchParams({
      google: "1",
      email: identity.email,
    });
    if (identity.name) qs.set("name", identity.name);

    return {
      ok: true,
      status: "needs_signup",
      email: identity.email,
      name: identity.name || null,
      redirectTo: `/signup?${qs.toString()}`,
    };
  }

  if (!byEmail.isActive) {
    return {
      ok: false,
      error: "This account is suspended.",
      code: "SUSPENDED",
      statusCode: 403,
    };
  }

  if (byEmail.googleSub && byEmail.googleSub !== identity.sub) {
    return {
      ok: false,
      error:
        "That email is linked to a different Google account. Sign in with phone or email.",
      code: "GOOGLE_MISMATCH",
      statusCode: 409,
    };
  }

  const email = (byEmail.email || identity.email).trim().toLowerCase();
  await prisma.user.update({
    where: { id: byEmail.id },
    data: {
      googleSub: identity.sub,
      googleAvatar: identity.picture || byEmail.googleAvatar,
      name: byEmail.name || identity.name || null,
      email,
      ...(!byEmail.totpEnabled || !email ? { lastLoginAt: new Date() } : {}),
    },
  });

  // --- Email 2FA ---
  if (byEmail.totpEnabled && email) {
    const challenge = await startEmail2faChallenge(
      session,
      {
        id: byEmail.id,
        phone: byEmail.phone,
        email,
        name: byEmail.name || identity.name || null,
        role: byEmail.role,
        totpEnabled: true,
        googleSub: identity.sub,
      },
      {
        emailOverride: email,
        firstName:
          byEmail.name?.split(" ")[0] ||
          identity.name?.split(" ")[0] ||
          "Customer",
        googleSub: identity.sub,
      }
    );

    if (!challenge.ok && !challenge.phoneFallback) {
      return {
        ok: false,
        error: challenge.error || "Could not start two-factor sign-in.",
        code: "UNAVAILABLE",
        statusCode: 500,
      };
    }

    const hint = challenge.emailHint || email;
    const params = new URLSearchParams({
      google: "2fa",
      emailHint: hint,
    });
    if (!challenge.ok) params.set("emailFailed", "1");

    return {
      ok: true,
      status: "needs_2fa",
      emailHint: hint,
      emailFailed: !challenge.ok,
      redirectTo: `/login?${params.toString()}`,
    };
  }

  // --- Full login ---
  const needsPin = !byEmail.pinHash;
  markSessionLogin(session, {
    userId: byEmail.id,
    phone: byEmail.phone,
    role: byEmail.role,
    needsPinSetup: needsPin,
  });
  await session.save();

  return {
    ok: true,
    status: "logged_in",
    needsPinSetup: needsPin,
    redirectTo: needsPin ? "/login?setup=pin" : "/dashboard",
  };
}
