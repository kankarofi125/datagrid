import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  GOOGLE_OAUTH_COOKIE_PATH,
  GOOGLE_OAUTH_COOKIES,
  type GoogleLoginReason,
  exchangeGoogleCode,
  getGoogleConfig,
  secureStringEqual,
  verifyGoogleIdToken,
} from "@/lib/auth/google";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

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
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_COOKIES.state)?.value;
  const nonce = cookieStore.get(GOOGLE_OAUTH_COOKIES.nonce)?.value;
  const codeVerifier = cookieStore.get(GOOGLE_OAUTH_COOKIES.verifier)?.value;
  const referral = cookieStore.get(GOOGLE_OAUTH_COOKIES.referral)?.value;

  const hasCode = Boolean(code);
  const hasReturnedState = Boolean(returnedState);
  const hasExpectedState = Boolean(expectedState);
  const hasNonce = Boolean(nonce);
  const hasVerifier = Boolean(codeVerifier);
  const hasOAuthCookies = hasExpectedState && hasNonce && hasVerifier;
  const stateMatch =
    hasReturnedState &&
    hasExpectedState &&
    secureStringEqual(returnedState!, expectedState!);

  if (!hasCode || !hasReturnedState) {
    console.warn("[auth/google/callback] incomplete provider callback", {
      hasCode,
      hasReturnedState,
      hasOAuthCookies,
    });
    return loginRedirect(request, "invalid");
  }

  if (!hasOAuthCookies) {
    console.warn(
      "[auth/google/callback] OAuth cookies missing (expired, blocked, or cleared)",
      {
        hasExpectedState,
        hasNonce,
        hasVerifier,
        hasReturnedState,
      }
    );
    return loginRedirect(request, "expired");
  }

  if (!stateMatch) {
    console.warn(
      "[auth/google/callback] state mismatch (stale tab, double-start, or tampered request)",
      {
        returnedStateLen: returnedState!.length,
        expectedStateLen: expectedState!.length,
      }
    );
    return loginRedirect(request, "mismatch");
  }

  try {
    const idToken = await exchangeGoogleCode({
      config,
      code: code!,
      codeVerifier: codeVerifier!,
    });
    const identity = await verifyGoogleIdToken({
      idToken,
      audience: config.clientId,
      nonce: nonce!,
    });

    const user = await prisma.user.findUnique({
      where: { googleSub: identity.sub },
    });

    if (user) {
      if (!user.isActive) return loginRedirect(request, "suspended");

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          name: user.name || identity.name || null,
          googleAvatar: identity.picture || user.googleAvatar,
        },
      });

      const session = await getSession();
      session.userId = user.id;
      session.phone = user.phone;
      session.role = user.role;
      session.isLoggedIn = true;
      delete session.adminUsername;
      delete session.pendingGoogle;
      await session.save();

      return clearOAuthCookies(
        NextResponse.redirect(new URL("/dashboard", request.url), 303)
      );
    }

    const session = await getSession();
    session.pendingGoogle = {
      sub: identity.sub,
      email: identity.email,
      name: identity.name,
      picture: identity.picture,
      referral,
      // Phone-link window after a successful Google identity (separate from PKCE cookies).
      expiresAt: Date.now() + 20 * 60 * 1000,
    };
    await session.save();

    return clearOAuthCookies(
      NextResponse.redirect(new URL("/login?google=phone", request.url), 303)
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Google OAuth error";
    console.error("[auth/google/callback] token exchange or verify failed", {
      message,
      redirectUri: config.redirectUri,
      // Never log code, verifier, tokens, or client secret.
    });
    return loginRedirect(request, "unavailable");
  }
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
