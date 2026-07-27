import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp";
import {
  getLivePendingSignup,
  getSession,
} from "@/lib/auth/session";
import {
  assertSignupIdentifiersFree,
  parkPendingSignup,
  parseSignupFields,
} from "@/lib/auth/signup";
import { maskEmail } from "@/lib/auth/resolve-identifier";

/**
 * Start create-account: validate name/email/phone, park pendingSignup, send phone OTP.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = parseSignupFields(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, code: parsed.code },
        { status: 400 }
      );
    }

    const free = await assertSignupIdentifiersFree(
      parsed.fields.phone,
      parsed.fields.email
    );
    if (!free.ok) {
      return NextResponse.json(
        { error: free.error, code: free.code },
        { status: 409 }
      );
    }

    const session = await getSession();
    // Absorb Google identity if still parked (new Google → signup).
    const pendingGoogle =
      session.pendingGoogle && session.pendingGoogle.expiresAt > Date.now()
        ? session.pendingGoogle
        : null;

    const googleEmail = pendingGoogle?.email?.trim().toLowerCase();
    const emailVerifiedByGoogle =
      Boolean(googleEmail) && googleEmail === parsed.fields.email;

    parkPendingSignup(session, {
      ...parsed.fields,
      googleSub: pendingGoogle?.sub,
      googleAvatar: pendingGoogle?.picture,
      phoneVerified: false,
      emailVerified: emailVerifiedByGoogle,
    });
    await session.save();

    const otp = await requestOtp({
      phone: parsed.fields.phone,
      channels: "whatsapp",
      firstName: parsed.fields.name.split(" ")[0],
    });

    if (!otp.ok) {
      return NextResponse.json(
        {
          error: otp.error || "Could not send phone verification code",
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
      step: "phone-otp",
      phoneLocal: parsed.fields.phoneLocal,
      emailHint: maskEmail(parsed.fields.email),
      emailAlreadyVerified: emailVerifiedByGoogle,
      channelHint,
      expiresInSec: "expiresInSec" in otp ? otp.expiresInSec : 120,
      channels: delivered,
    });
  } catch (err) {
    console.error("[auth/signup/start]", err);
    return NextResponse.json(
      { error: "Could not start signup. Try again." },
      { status: 500 }
    );
  }
}

/** Resume mid-signup UI state from session. */
export async function GET() {
  try {
    const session = await getSession();
    const pending = getLivePendingSignup(session);
    if (!pending) {
      return NextResponse.json({ ok: false, pending: null });
    }
    return NextResponse.json({
      ok: true,
      pending: {
        name: pending.name,
        emailHint: maskEmail(pending.email),
        phoneLocal: pending.phoneLocal,
        phoneVerified: pending.phoneVerified,
        emailVerified: pending.emailVerified,
        expiresAt: pending.expiresAt,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, pending: null });
  }
}
