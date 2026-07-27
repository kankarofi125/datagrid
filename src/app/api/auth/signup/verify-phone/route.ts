import { NextResponse } from "next/server";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { getLivePendingSignup, getSession } from "@/lib/auth/session";
import { maskEmail } from "@/lib/auth/resolve-identifier";

/**
 * Confirm phone OTP for pending signup, then send email OTP (unless Google already verified email).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "");
    const session = await getSession();
    const pending = getLivePendingSignup(session);

    if (!pending) {
      delete session.pendingSignup;
      await session.save();
      return NextResponse.json(
        {
          error: "Signup session expired. Start again.",
          code: "SIGNUP_EXPIRED",
        },
        { status: 401 }
      );
    }

    const result = await verifyOtp(pending.phone, code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    session.pendingSignup = {
      ...pending,
      phoneVerified: true,
      expiresAt: Math.max(pending.expiresAt, Date.now() + 15 * 60 * 1000),
    };
    await session.save();

    // Google already proved this email — finish after phone only.
    if (session.pendingSignup.emailVerified) {
      return NextResponse.json({
        ok: true,
        step: "create",
        emailSkipped: true,
        emailHint: maskEmail(pending.email),
      });
    }

    const emailOtp = await requestOtp({
      email: pending.email,
      channels: "email",
      firstName: pending.name.split(" ")[0],
      skipCooldown: true,
    });

    if (!emailOtp.ok) {
      return NextResponse.json(
        {
          error:
            emailOtp.error ||
            "Phone verified, but we could not email a code. Tap resend or try again.",
          code: "EMAIL_OTP_FAILED",
          phoneVerified: true,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      step: "email-otp",
      emailHint: maskEmail(pending.email),
      expiresInSec:
        "expiresInSec" in emailOtp ? emailOtp.expiresInSec : 120,
    });
  } catch (err) {
    console.error("[auth/signup/verify-phone]", err);
    return NextResponse.json(
      { error: "Could not verify phone. Try again." },
      { status: 500 }
    );
  }
}
