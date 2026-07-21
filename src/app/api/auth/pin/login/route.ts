import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isValidPin, verifyPin } from "@/lib/auth/pin";
import { toE164, toLocalPhone } from "@/lib/phone";

/**
 * Login with phone + PIN for existing users (after number lookup).
 * Does not send OTP — phone was already confirmed as registered.
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

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await getSession();
    session.userId = user.id;
    session.phone = user.phone;
    session.role = user.role;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      ok: true,
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
