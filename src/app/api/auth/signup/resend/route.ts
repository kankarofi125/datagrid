import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp";
import { getLivePendingSignup, getSession } from "@/lib/auth/session";
import { maskEmail } from "@/lib/auth/resolve-identifier";

/**
 * Resend signup OTP for phone or email step.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const channel = String(body.channel || "phone").toLowerCase();
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

    if (channel === "email") {
      if (!pending.phoneVerified) {
        return NextResponse.json(
          { error: "Verify your phone before resending email code." },
          { status: 400 }
        );
      }
      if (pending.emailVerified) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          message: "Email already verified",
        });
      }
      const otp = await requestOtp({
        email: pending.email,
        channels: "email",
        firstName: pending.name.split(" ")[0],
      });
      if (!otp.ok) {
        return NextResponse.json(
          {
            error: otp.error,
            cooldownSec: "cooldownSec" in otp ? otp.cooldownSec : undefined,
          },
          { status: 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        channel: "email",
        emailHint: maskEmail(pending.email),
        expiresInSec: "expiresInSec" in otp ? otp.expiresInSec : 120,
      });
    }

    // phone
    if (pending.phoneVerified) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "Phone already verified",
      });
    }
    const otp = await requestOtp({
      phone: pending.phone,
      channels: "whatsapp",
      firstName: pending.name.split(" ")[0],
    });
    if (!otp.ok) {
      return NextResponse.json(
        {
          error: otp.error,
          cooldownSec: "cooldownSec" in otp ? otp.cooldownSec : undefined,
        },
        { status: 400 }
      );
    }
    const delivered = "channels" in otp ? otp.channels || [] : [];
    const channelHint = delivered.includes("sms")
      ? "SMS"
      : delivered.includes("whatsapp")
        ? "WhatsApp"
        : null;
    return NextResponse.json({
      ok: true,
      channel: "phone",
      phoneLocal: pending.phoneLocal,
      channelHint,
      expiresInSec: "expiresInSec" in otp ? otp.expiresInSec : 120,
    });
  } catch (err) {
    console.error("[auth/signup/resend]", err);
    return NextResponse.json(
      { error: "Could not resend code. Try again." },
      { status: 500 }
    );
  }
}
