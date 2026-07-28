import { NextResponse } from "next/server";
import { unsealData } from "iron-session";
import { getIronSession } from "iron-session";
import {
  getSession,
  safeInternalPath,
  sessionOptions,
  type SessionData,
} from "@/lib/auth/session";

export const runtime = "nodejs";

type HandoffPayload = {
  userId?: string;
  phone?: string;
  role?: string;
  needsPinSetup?: boolean;
  exp?: number;
};

/**
 * Post-OAuth bounce: confirm the session cookie is readable, or establish it
 * from a one-shot `handoff` seal if the browser dropped Set-Cookie on the
 * cross-site Google → callback redirect.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeInternalPath(url.searchParams.get("next"), "/dashboard");
  const handoff = url.searchParams.get("handoff");

  let session = await getSession();

  if ((!session.isLoggedIn || !session.userId) && handoff) {
    try {
      const data = await unsealData<HandoffPayload>(handoff, {
        password: sessionOptions.password,
        ttl: 120,
      });
      if (
        data?.userId &&
        data.phone &&
        data.role &&
        typeof data.exp === "number" &&
        data.exp > Date.now()
      ) {
        // Write a real session cookie on THIS response (same-site navigation).
        const destPath = data.needsPinSetup ? "/login?setup=pin" : next;
        const response = NextResponse.redirect(
          new URL(destPath, request.url),
          303
        );
        const iron = await getIronSession<SessionData>(
          request,
          response,
          sessionOptions
        );
        iron.userId = data.userId;
        iron.phone = data.phone;
        iron.role = data.role;
        iron.isLoggedIn = true;
        iron.lastActivityAt = Date.now();
        if (data.needsPinSetup) iron.needsPinSetup = true;
        else delete iron.needsPinSetup;
        delete iron.pendingGoogle;
        delete iron.pendingLogin2fa;
        delete iron.pendingSignup;
        delete iron.adminUsername;
        await iron.save();
        response.headers.set("Cache-Control", "no-store");
        console.info("[auth/session/continue] restored session from handoff", {
          userId: data.userId,
        });
        return response;
      }
    } catch (err) {
      console.warn(
        "[auth/session/continue] handoff unseal failed",
        err instanceof Error ? err.message : err
      );
    }
  }

  // Re-read in case handoff path didn't run
  session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    const cookieHeader = request.headers.get("cookie") || "";
    console.warn("[auth/session/continue] session missing after OAuth", {
      next,
      isLoggedIn: session.isLoggedIn,
      hasUserId: Boolean(session.userId),
      hasSessionCookie: cookieHeader.includes("datagrid_session="),
      hasHandoff: Boolean(handoff),
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
