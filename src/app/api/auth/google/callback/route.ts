import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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

  if (
    !code ||
    !returnedState ||
    !expectedState ||
    !nonce ||
    !codeVerifier ||
    !secureStringEqual(returnedState, expectedState)
  ) {
    const hasCookies = Boolean(expectedState && nonce && codeVerifier);
    const reason: GoogleLoginReason = !code || !returnedState
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

    // Returning users: googleSub first, then verified Google email (case-insensitive).
    // Email match logs them in without asking for phone again.
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

      // Email already tied to a different Google subject — do not hijack.
      if (byEmail.googleSub && byEmail.googleSub !== identity.sub) {
        console.warn("[auth/google/callback] email owned by different googleSub");
        return loginRedirect(request, "unavailable");
      }

      await establishSession(byEmail, identity);
      return clearOAuthCookies(
        NextResponse.redirect(new URL("/dashboard", request.url), 303)
      );
    }

    // Brand-new Google identity: collect + verify Nigerian line once.
    const session = await getSession();
    session.pendingGoogle = {
      sub: identity.sub,
      email: identity.email,
      name: identity.name,
      picture: identity.picture,
      referral,
      expiresAt: Date.now() + 20 * 60 * 1000,
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

async function establishSession(
  user: {
    id: string;
    phone: string;
    role: string;
    name: string | null;
    googleAvatar: string | null;
    googleSub: string | null;
    email: string | null;
  },
  identity: GoogleIdentity
) {
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      googleSub: identity.sub,
      googleAvatar: identity.picture || user.googleAvatar,
      name: user.name || identity.name || null,
      email: user.email || identity.email,
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
