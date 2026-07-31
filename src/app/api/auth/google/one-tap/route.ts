import { NextResponse } from "next/server";
import { completeGoogleWebLogin } from "@/lib/auth/google-web-login";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Google One Tap / GIS credential endpoint.
 * Body: { credential: string }  // ID token from Google Identity Services
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const credential = String(
      body.credential || body.idToken || body.token || ""
    ).trim();

    const session = await getSession();

    // Already signed in — nothing to do
    if (session.isLoggedIn && session.userId) {
      return NextResponse.json({
        ok: true,
        status: "logged_in",
        redirectTo: session.needsPinSetup ? "/login?setup=pin" : "/dashboard",
      });
    }

    const result = await completeGoogleWebLogin(session, credential);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.statusCode }
      );
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      redirectTo: result.redirectTo,
      ...(result.status === "needs_signup"
        ? { email: result.email, name: result.name }
        : {}),
      ...(result.status === "needs_2fa"
        ? { emailHint: result.emailHint, emailFailed: result.emailFailed }
        : {}),
      ...(result.status === "logged_in"
        ? { needsPinSetup: result.needsPinSetup }
        : {}),
    });
  } catch (err) {
    console.error(
      "[auth/google/one-tap]",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Google sign-in failed. Try again.", code: "UNAVAILABLE" },
      { status: 500 }
    );
  }
}
