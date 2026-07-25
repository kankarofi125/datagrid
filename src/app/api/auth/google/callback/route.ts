import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  GOOGLE_OAUTH_COOKIE_PATH,
  GOOGLE_OAUTH_COOKIES,
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

  if (
    !code ||
    !returnedState ||
    !expectedState ||
    !nonce ||
    !codeVerifier ||
    !secureStringEqual(returnedState, expectedState)
  ) {
    return loginRedirect(request, "invalid");
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
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    await session.save();

    return clearOAuthCookies(
      NextResponse.redirect(new URL("/login?google=phone", request.url), 303)
    );
  } catch (error) {
    console.error(
      "[auth/google/callback]",
      error instanceof Error ? error.message : "Unknown Google OAuth error"
    );
    return loginRedirect(request, "unavailable");
  }
}

function loginRedirect(request: Request, reason: string) {
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
