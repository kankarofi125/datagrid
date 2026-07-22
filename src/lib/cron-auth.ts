import { NextResponse } from "next/server";

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * Manual calls may use `x-cron-secret` header.
 */
export function authorizeCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const isDev =
    process.env.NODE_ENV !== "production" ||
    process.env.PAYMENT_MODE === "simulate";

  if (!secret) {
    // Allow in dev/sim without secret so local testing works
    if (isDev) return null;
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }

  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const header = req.headers.get("x-cron-secret") || "";

  if (bearer === secret || header === secret) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
