import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isValidPin, verifyPin } from "@/lib/auth/pin";
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
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }

    const session = await getSession();
    delete session.adminUsername;
    delete session.pendingGoogle;

    if (user.totpEnabled && user.email) {
      const challenge = await startEmail2faChallenge(session, {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        totpEnabled: user.totpEnabled,
      });

      if (!challenge.ok) {
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
        devHint: challenge.devHint,
        message: `We sent a verification code to ${challenge.emailHint}`,
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
