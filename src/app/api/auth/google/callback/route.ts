import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { prisma } from "@/lib/db";
import {
  GOOGLE_OAUTH_COOKIE_PATH,
  GOOGLE_OAUTH_COOKIES,
  type GoogleLoginReason,
  type GoogleIdentity,
  exchangeGoogleCode,
  getGoogleConfig,
  secureStringEqual,
  verifyGoogleIdToken,
} from "@/lib/auth/google";
import {
  email2faLoginPath,
  startEmail2faChallenge,
} from "@/lib/auth/login-2fa";
import { PENDING_2FA_SESSION_MS } from "@/lib/auth/resolve-account-phone";
import {
  sessionOptions,
  type SessionData,
} from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Google OAuth callback.
 * Uses getIronSession(request, response) so pendingLogin2fa cookies stick on redirects.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const config = getGoogleConfig(request.url);
  if (!config) return loginRedirect(request, "config");

  const providerError = requestUrl.searchParams.get("error");
  if (providerError) {
    console.warn("[auth/google/callback] provider error", {
      error: providerError,
      description: requestUrl.searchParams.get("error_description"),
    });
    return loginRedirect(
      request,
      providerError === "access_denied" ? "cancelled" : "unavailable"
    );
  }

  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");

  // Read OAuth cookies from the incoming request
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieMap = parseCookieHeader(cookieHeader);
  const expectedState = cookieMap.get(GOOGLE_OAUTH_COOKIES.state);
  const nonce = cookieMap.get(GOOGLE_OAUTH_COOKIES.nonce);
  const codeVerifier = cookieMap.get(GOOGLE_OAUTH_COOKIES.verifier);
  const referral = cookieMap.get(GOOGLE_OAUTH_COOKIES.referral);

  if (
    !code ||
    !returnedState ||
    !expectedState ||
    !nonce ||
    !codeVerifier ||
    !secureStringEqual(returnedState, expectedState)
  ) {
    const hasCookies = Boolean(expectedState && nonce && codeVerifier);
    const reason: GoogleLoginReason =
      !code || !returnedState
        ? "invalid"
        : !hasCookies
          ? "expired"
          : "mismatch";
    console.warn("[auth/google/callback] request not verifiable", { reason });
    return loginRedirect(request, reason);
  }

  try {
    const idToken = await exchangeGoogleCode({
      config,
      code,
      codeVerifier,
    });
    const identity = await verifyGoogleIdToken({
      idToken,
      audience: config.clientId,
      nonce,
    });

    const bySub = await prisma.user.findUnique({
      where: { googleSub: identity.sub },
    });
    const byEmail =
      bySub ||
      (await prisma.user.findFirst({
        where: {
          email: { equals: identity.email, mode: "insensitive" },
        },
      }));

    if (byEmail) {
      if (!byEmail.isActive) return loginRedirect(request, "suspended");

      if (byEmail.googleSub && byEmail.googleSub !== identity.sub) {
        console.warn(
          "[auth/google/callback] email owned by different googleSub"
        );
        return loginRedirect(request, "unavailable");
      }

      return await finishReturningGoogleUser(request, byEmail, identity);
    }

    // Brand-new Google identity → signup with email/name prefilled + phone proof
    const signupQs = new URLSearchParams({
      google: "1",
      email: identity.email,
    });
    if (identity.name) signupQs.set("name", identity.name);
    if (referral) signupQs.set("ref", referral);
    const response = NextResponse.redirect(
      new URL(`/signup?${signupQs.toString()}`, request.url),
      303
    );
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    );
    session.pendingGoogle = {
      sub: identity.sub,
      email: identity.email,
      name: identity.name,
      picture: identity.picture,
      referral,
      expiresAt: Date.now() + 20 * 60 * 1000,
    };
    session.isLoggedIn = false;
    delete session.userId;
    delete session.pendingLogin2fa;
    delete session.pendingSignup;
    await session.save();
    return clearOAuthCookies(response);
  } catch (error) {
    console.error(
      "[auth/google/callback]",
      error instanceof Error ? error.message : "Unknown Google OAuth error"
    );
    return loginRedirect(request, "unavailable");
  }
}

async function finishReturningGoogleUser(
  request: Request,
  user: {
    id: string;
    phone: string;
    role: string;
    name: string | null;
    googleAvatar: string | null;
    googleSub: string | null;
    email: string | null;
    totpEnabled: boolean;
    isActive: boolean;
    pinHash: string | null;
  },
  identity: GoogleIdentity
) {
  const email = (user.email || identity.email).trim().toLowerCase();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      googleSub: identity.sub,
      googleAvatar: identity.picture || user.googleAvatar,
      name: user.name || identity.name || null,
      email,
      ...(!user.totpEnabled || !email ? { lastLoginAt: new Date() } : {}),
    },
  });

  // --- Email 2FA required ---
  if (user.totpEnabled && email) {
    // Build response first so iron-session can attach Set-Cookie to it
    const provisional = NextResponse.redirect(
      new URL("/login?google=2fa", request.url),
      303
    );
    const session = await getIronSession<SessionData>(
      request,
      provisional,
      sessionOptions
    );

    const challenge = await startEmail2faChallenge(
      session,
      {
        id: user.id,
        phone: user.phone,
        email,
        name: user.name || identity.name || null,
        role: user.role,
        totpEnabled: true,
        googleSub: identity.sub,
      },
      {
        emailOverride: email,
        firstName:
          user.name?.split(" ")[0] ||
          identity.name?.split(" ")[0] ||
          "Customer",
        googleSub: identity.sub,
      }
    );

    // Email may fail (Brevo) — still land on 2FA step with phone OTP fallback.
    // startEmail2faChallenge already parked pendingLogin2fa (phone + email).
    if (!challenge.ok && !challenge.phoneFallback) {
      console.error("[auth/google/callback] 2FA start failed", challenge.error);
      return loginRedirect(request, "unavailable");
    }

    const emailHint =
      challenge.emailHint ||
      (() => {
        const [local, domain] = email.split("@");
        if (!domain) return "***";
        return local.length <= 2 ? `*@${domain}` : `${local[0]}***@${domain}`;
      })();

    const path = email2faLoginPath({
      emailHint,
      source: "google",
      emailFailed: !challenge.ok,
    });
    // Rebuild redirect with full query; re-apply session on the final response
    // so Set-Cookie is attached to this redirect (not the provisional one).
    const response = NextResponse.redirect(new URL(path, request.url), 303);
    const session2 = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    );
    session2.isLoggedIn = false;
    delete session2.userId;
    delete session2.phone;
    delete session2.role;
    delete session2.adminUsername;
    delete session2.pendingGoogle;
    // Prefer values already parked by startEmail2faChallenge; re-assert phone.
    // Never shrink expiresAt to the 2‑min OTP code TTL — that broke "Use OTP instead".
    const parked = session.pendingLogin2fa;
    session2.pendingLogin2fa = {
      userId: user.id,
      phone: (parked?.phone || user.phone).trim(),
      email: (parked?.email || email).trim().toLowerCase(),
      googleSub: parked?.googleSub || identity.sub,
      name: parked?.name || user.name || identity.name,
      role: parked?.role || user.role,
      expiresAt:
        parked?.expiresAt && parked.expiresAt > Date.now()
          ? parked.expiresAt
          : Date.now() + PENDING_2FA_SESSION_MS,
    };
    await session2.save();

    console.info("[auth/google/callback] 2FA redirect", {
      userId: user.id,
      emailHint,
      emailFailed: !challenge.ok,
      hasPhone: Boolean(session2.pendingLogin2fa.phone),
      phoneLocal: session2.pendingLogin2fa.phone?.slice(-4),
      sessionExpiresInSec: Math.round(
        (session2.pendingLogin2fa.expiresAt - Date.now()) / 1000
      ),
    });
    return clearOAuthCookies(response);
  }

  // Full login (no 2FA) — still force PIN setup if missing
  const needsPin = !user.pinHash;
  const response = NextResponse.redirect(
    new URL(needsPin ? "/login?setup=pin" : "/dashboard", request.url),
    303
  );
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );
  session.userId = user.id;
  session.phone = user.phone;
  session.role = user.role;
  session.isLoggedIn = true;
  session.lastActivityAt = Date.now();
  session.needsPinSetup = needsPin;
  delete session.adminUsername;
  delete session.pendingGoogle;
  delete session.pendingLogin2fa;
  await session.save();
  return clearOAuthCookies(response);
}

function loginRedirect(request: Request, reason: GoogleLoginReason) {
  return clearOAuthCookies(
    NextResponse.redirect(
      new URL(`/login?google=${encodeURIComponent(reason)}`, request.url),
      303
    )
  );
}

function clearOAuthCookies(response: NextResponse) {
  for (const name of Object.values(GOOGLE_OAUTH_COOKIES)) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: GOOGLE_OAUTH_COOKIE_PATH,
    });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function parseCookieHeader(header: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) map.set(key, decodeURIComponent(value));
  }
  return map;
}
