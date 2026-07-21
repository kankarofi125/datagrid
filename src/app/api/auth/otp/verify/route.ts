import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { verifyOtp } from "@/lib/auth/otp";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const refCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone || "");
    const code = String(body.code || "");
    const referral = body.referral ? String(body.referral) : undefined;

    const result = await verifyOtp(phone, code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { phone: result.phone } });
    if (!user) {
      let referredById: string | undefined;
      if (referral) {
        const ref = await prisma.user.findUnique({
          where: { referralCode: referral.toUpperCase() },
        });
        if (ref) referredById = ref.id;
      }
      user = await prisma.user.create({
        data: {
          phone: result.phone,
          phoneLocal: result.phoneLocal,
          referralCode: refCode(),
          referredById,
          wallets: {
            create: [
              { kind: "MAIN", balance: 0 },
              { kind: "COMMISSION", balance: 0 },
            ],
          },
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

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
    console.error("[otp/verify]", err);
    const dbConfigured = Boolean(process.env.DATABASE_URL);
    return NextResponse.json(
      {
        error: dbConfigured
          ? "Login service temporarily unavailable. Try again."
          : "Server database is not configured. Set DATABASE_URL on Vercel.",
        code: dbConfigured ? "OTP_FAILED" : "DB_NOT_CONFIGURED",
      },
      { status: 500 }
    );
  }
}
