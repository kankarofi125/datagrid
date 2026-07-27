import { NextResponse } from "next/server";
import { getSession, safeInternalPath } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Post-OAuth bounce: confirm the session cookie is readable on a fresh request
 * before sending the user into the app. Avoids silent dashboard → /login loops
 * with no error when Set-Cookie failed to stick.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeInternalPath(url.searchParams.get("next"), "/dashboard");
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    console.warn("[auth/session/continue] session missing after OAuth", {
      next,
      isLoggedIn: session.isLoggedIn,
      hasUserId: Boolean(session.userId),
    });
    return NextResponse.redirect(
      new URL("/login?google=session", request.url),
      303
    );
  }

  if (session.needsPinSetup) {
    return NextResponse.redirect(
      new URL("/login?setup=pin", request.url),
      303
    );
  }

  return NextResponse.redirect(new URL(next, request.url), 303);
}
