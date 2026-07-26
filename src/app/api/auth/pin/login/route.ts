import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isValidPin, verifyPin } from "@/lib/auth/pin";
import { requestOtp } from "@/lib/auth/otp";
import { toE164, toLocalPhone } from "@/lib/phone";

/**
 * Login with phone + PIN for existing users (after number lookup).
 * If email 2FA is enabled, sends a branded email code and holds a pending session.
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

    // Email 2FA: PIN ok → send code, do not fully log in yet.
    if (user.totpEnabled && user.email) {
      const otp = await requestOtp({
        email: user.email,
        channels: "email",
        firstName: user.name?.split(" ")[0] || "Customer",
        skipCooldown: true,
      });
      if (!otp.ok) {
        console.error("[auth/pin/login] 2FA email failed", otp.error);
        return NextResponse.json(
          {
            error:
              otp.error ||
              "Could not send your 2FA email code. Check Brevo settings.",
            code: "2FA_SEND_FAILED",
          },
          { status: 502 }
        );
      }

      session.isLoggedIn = false;
      delete session.userId;
      delete session.phone;
      delete session.role;
      session.pendingLogin2fa = {
        userId: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        expiresAt: Date.now() + 10 * 60 * 1000,
      };
      await session.save();

      const [localPart, domain] = user.email.split("@");
      const hint =
        localPart.length <= 2
          ? `*@${domain}`
          : `${localPart[0]}***@${domain}`;

      return NextResponse.json({
        ok: true,
        needs2fa: true,
        emailHint: hint,
        devHint: otp.devHint,
        message: `We sent a verification code to ${hint}`,
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
