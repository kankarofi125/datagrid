import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function safeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * Manual calls may use `x-cron-secret` header.
 * Always requires CRON_SECRET in production (never fail open).
 */
export function authorizeCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 503 }
      );
    }
    // Local/dev only without secret
    return null;
  }

  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const header = req.headers.get("x-cron-secret") || "";

  if (safeEqualString(bearer, secret) || safeEqualString(header, secret)) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
