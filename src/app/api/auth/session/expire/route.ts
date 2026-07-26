import { NextResponse } from "next/server";
import { getSession, safeInternalPath } from "@/lib/auth/session";

/**
 * Clear the login cookie and redirect to login.
 * Cookie mutation must happen in a Route Handler (not a Server Component layout).
 */
export async function GET(request: Request) {
  const session = await getSession();
  session.destroy();

  const url = new URL(request.url);
  const next = safeInternalPath(
    url.searchParams.get("next"),
    "/login?session=expired"
  );

  return NextResponse.redirect(new URL(next, request.url), 303);
}

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true, expired: true });
}
