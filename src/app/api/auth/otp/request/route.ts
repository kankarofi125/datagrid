import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone || "");
    const result = await requestOtp(phone);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, cooldownSec: result.cooldownSec },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      phone: result.phone,
      phoneLocal: result.phoneLocal,
      // only in simulate mode
      devHint: result.devHint,
    });
  } catch (err) {
    console.error("[otp/request]", err);
    const dbConfigured = Boolean(process.env.DATABASE_URL);
    return NextResponse.json(
      {
        error: dbConfigured
          ? "Login service temporarily unavailable. Try again."
          : "Server database is not configured. Set DATABASE_URL on Vercel.",
        code: dbConfigured ? "OTP_FAILED" : "DB_NOT_CONFIGURED",
      },
      { status: 500 }
    );
  }
}
