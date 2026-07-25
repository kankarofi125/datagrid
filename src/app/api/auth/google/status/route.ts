import { NextResponse } from "next/server";
import { getGoogleConfigPublic } from "@/lib/auth/google";

export const runtime = "nodejs";

/**
 * Non-secret Google OAuth config check for production debugging.
 * Does not expose client secret or tokens.
 */
export async function GET(request: Request) {
  const snapshot = getGoogleConfigPublic(request.url);
  return NextResponse.json(
    {
      ok: snapshot.configured,
      google: snapshot,
      time: new Date().toISOString(),
    },
    {
      status: snapshot.configured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
