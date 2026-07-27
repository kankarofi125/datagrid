import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth/otp";
import {
  getLivePendingSignup,
  getSession,
  markSessionLogin,
} from "@/lib/auth/session";
import { createUserFromSignup } from "@/lib/auth/signup";

/**
 * Confirm email OTP (or accept already-verified email), create User, open session.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "");
    const skipEmail = body.skipEmail === true;
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

    if (!pending.phoneVerified) {
      return NextResponse.json(
        {
          error: "Verify your phone first.",
          code: "PHONE_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (!pending.emailVerified) {
      if (skipEmail) {
        return NextResponse.json(
          { error: "Email verification is required.", code: "EMAIL_REQUIRED" },
          { status: 400 }
        );
      }
      const result = await verifyOtp(pending.email, code, {
        email: pending.email,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    const created = await createUserFromSignup({
      ...pending,
      phoneVerified: true,
      emailVerified: true,
    });

    if (!created.ok) {
      return NextResponse.json(
        { error: created.error, code: created.code },
        { status: 409 }
      );
    }

    const user = created.user;
    delete session.pendingSignup;
    delete session.pendingGoogle;
    delete session.pendingLogin2fa;
    markSessionLogin(session, {
      userId: user.id,
      phone: user.phone,
      role: user.role,
      needsPinSetup: true,
    });
    await session.save();

    return NextResponse.json({
      ok: true,
      needsPinSetup: true,
      isNew: true,
      user: {
        id: user.id,
        phone: user.phoneLocal,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[auth/signup/verify-email]", err);
    return NextResponse.json(
      { error: "Could not finish signup. Try again." },
      { status: 500 }
    );
  }
}
