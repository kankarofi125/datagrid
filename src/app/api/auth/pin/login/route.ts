import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isValidPin, verifyPin } from "@/lib/auth/pin";
import {
  clearPinFailures,
  getPinLockStatus,
  recordPinFailure,
} from "@/lib/auth/pin-lockout";
import { startEmail2faChallenge } from "@/lib/auth/login-2fa";
import { resolveUserByIdentifier } from "@/lib/auth/resolve-identifier";

/**
 * Login with phone OR email + PIN.
 * If email 2FA is enabled, sends Brevo code and holds pendingLogin2fa.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const pin = String(body.pin || "");
    if (!isValidPin(pin)) {
      return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
    }

    const resolved = await resolveUserByIdentifier({
      phone: body.phone ? String(body.phone) : undefined,
      email: body.email ? String(body.email) : undefined,
    });

    if (!resolved.ok) {
      const status = resolved.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        {
          error:
            resolved.code === "NOT_FOUND"
              ? "No account found. Create an account or check your details."
              : resolved.error,
          code: resolved.code,
        },
        { status }
      );
    }

    const user = resolved.user;
    if (!user.isActive) {
      return NextResponse.json(
        { error: "This account is suspended. Contact support." },
        { status: 403 }
      );
    }

    const lockKey = user.phone;
    const lock = await getPinLockStatus(lockKey);
    if (lock.locked) {
      return NextResponse.json(
        {
          error: `Too many incorrect PINs. Try again in ${lock.retryAfterSec}s.`,
          code: "PIN_LOCKED",
          retryAfterSec: lock.retryAfterSec,
        },
        { status: 429 }
      );
    }

    if (!user.pinHash) {
      return NextResponse.json(
        { error: "Set up your PIN with OTP first.", code: "PIN_REQUIRED" },
        { status: 400 }
      );
    }

    const ok = await verifyPin(pin, user.pinHash);
    if (!ok) {
      const fail = await recordPinFailure(lockKey);
      if (fail.locked) {
        return NextResponse.json(
          {
            error: `Too many incorrect PINs. Try again in ${fail.retryAfterSec}s.`,
            code: "PIN_LOCKED",
            retryAfterSec: fail.retryAfterSec,
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error: "Incorrect PIN",
          attemptsLeft: fail.attemptsLeft,
        },
        { status: 401 }
      );
    }

    await clearPinFailures(lockKey);

    const session = await getSession();
    delete session.adminUsername;
    delete session.pendingGoogle;
    delete session.pendingSignup;
    delete session.needsPinSetup;

    if (user.totpEnabled && user.email) {
      const challenge = await startEmail2faChallenge(session, {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        totpEnabled: user.totpEnabled,
      });

      if (!challenge.ok && !challenge.phoneFallback) {
        console.error("[auth/pin/login] 2FA email failed", challenge.error);
        return NextResponse.json(
          {
            error:
              challenge.error ||
              "Could not send your 2FA email code. Check Brevo settings.",
            code: "2FA_SEND_FAILED",
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ok: true,
        needs2fa: true,
        emailHint: challenge.emailHint,
        expiresInSec: challenge.expiresInSec ?? 120,
        emailFailed: !challenge.ok,
        message: challenge.ok
          ? `We sent a verification code to ${challenge.emailHint}`
          : "Email code could not be sent. Use OTP instead (WhatsApp/SMS).",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    delete session.pendingLogin2fa;
    session.userId = user.id;
    session.phone = user.phone;
    session.role = user.role;
    session.isLoggedIn = true;
    session.lastActivityAt = Date.now();
    session.needsPinSetup = false;
    await session.save();

    return NextResponse.json({
      ok: true,
      needs2fa: false,
      user: {
        id: user.id,
        phone: user.phoneLocal,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[auth/pin/login]", err);
    return NextResponse.json({ error: "Login failed. Try again." }, { status: 500 });
  }
}
