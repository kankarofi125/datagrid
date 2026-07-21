import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp";

export async function POST(req: Request) {
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
}
