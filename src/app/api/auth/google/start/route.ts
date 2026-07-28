import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_COOKIE_PATH,
  GOOGLE_OAUTH_COOKIES,
  GOOGLE_OAUTH_MAX_AGE_SECONDS,
  createCodeChallenge,
  createGoogleAuthorization,
  getGoogleConfig,
  randomOAuthValue,
} from "@/lib/auth/google";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getGoogleConfig(request.url);
  if (!config) {
    return NextResponse.redirect(new URL("/login?google=config", request.url), 303);
  }

  const requestOrigin = new URL(request.url).origin;
  // Exact URI Google must allow (character-for-character).
  console.info("[auth/google/start]", {
    origin: requestOrigin,
    redirectUri: config.redirectUri,
    clientIdPrefix: config.clientId.slice(0, 16) + "…",
  });

  const state = randomOAuthValue();
  const nonce = randomOAuthValue();
  const codeVerifier = randomOAuthValue(48);
  const authorizationUrl = createGoogleAuthorization({
    config,
    state,
    nonce,
    codeChallenge: createCodeChallenge(codeVerifier),
  });
  const response = NextResponse.redirect(authorizationUrl, 302);
  const secure = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    maxAge: GOOGLE_OAUTH_MAX_AGE_SECONDS,
    path: GOOGLE_OAUTH_COOKIE_PATH,
    priority: "high" as const,
  };

  response.cookies.set(GOOGLE_OAUTH_COOKIES.state, state, cookieOptions);
  response.cookies.set(GOOGLE_OAUTH_COOKIES.nonce, nonce, cookieOptions);
  response.cookies.set(GOOGLE_OAUTH_COOKIES.verifier, codeVerifier, cookieOptions);

  const referral = new URL(request.url).searchParams.get("ref")?.toUpperCase();
  if (referral && /^[A-Z0-9]{6,12}$/.test(referral)) {
    response.cookies.set(GOOGLE_OAUTH_COOKIES.referral, referral, cookieOptions);
  } else {
    response.cookies.set(GOOGLE_OAUTH_COOKIES.referral, "", {
      ...cookieOptions,
      maxAge: 0,
    });
  }

  response.headers.set("Cache-Control", "no-store");
  return response;
}
