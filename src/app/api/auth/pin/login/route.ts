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
import { toE164, toLocalPhone } from "@/lib/phone";

/**
 * Login with phone + PIN.
 * If email 2FA is enabled, sends Brevo code and holds pendingLogin2fa.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = String(body.phone || "");
    const pin = String(body.pin || "");
    const e164 = toE164(raw);
    const local = toLocalPhone(raw);

    if (!e164 || !local) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    if (!isValidPin(pin)) {
      return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
    }

    const lock = await getPinLockStatus(e164);
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

    const user = await prisma.user.findUnique({ where: { phone: e164 } });
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "No account for this number. Continue with OTP." },
        { status: 404 }
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
      const fail = await recordPinFailure(e164);
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

    await clearPinFailures(e164);

    const session = await getSession();
    delete session.adminUsername;
    delete session.pendingGoogle;
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
