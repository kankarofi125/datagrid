import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { verifyOtp } from "@/lib/auth/otp";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CacheKeys, invalidate } from "@/lib/cache";

const refCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone || "");
    const code = String(body.code || "");
    const session = await getSession();
    const pendingGoogle =
      session.pendingGoogle && session.pendingGoogle.expiresAt > Date.now()
        ? session.pendingGoogle
        : undefined;
    const referral = body.referral
      ? String(body.referral)
      : pendingGoogle?.referral;

    const result = await verifyOtp(phone, code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    let referredById: string | undefined;
    let user = await prisma.user.findUnique({ where: { phone: result.phone } });
    if (!user) {
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
      if (referredById) {
        await invalidate(CacheKeys.referrals(referredById));
      }
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    if (pendingGoogle) {
      const alreadyLinked = await prisma.user.findUnique({
        where: { googleSub: pendingGoogle.sub },
        select: { id: true },
      });
      if (alreadyLinked && alreadyLinked.id !== user.id) {
        return NextResponse.json(
          {
            error:
              "This Google account is already linked to another DataGrid account.",
            code: "GOOGLE_ALREADY_LINKED",
          },
          { status: 409 }
        );
      }

      const emailOwner = await prisma.user.findUnique({
        where: { email: pendingGoogle.email },
        select: { id: true },
      });
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleSub: pendingGoogle.sub,
          googleAvatar: pendingGoogle.picture,
          name: user.name || pendingGoogle.name || null,
          email:
            !emailOwner || emailOwner.id === user.id
              ? pendingGoogle.email
              : user.email,
        },
      });
    }

    session.userId = user.id;
    session.phone = user.phone;
    session.role = user.role;
    delete session.adminUsername;
    delete session.pendingGoogle;
    session.isLoggedIn = true;
    await session.save();

    const needsPinSetup = !user.pinHash;

    return NextResponse.json({
      ok: true,
      needsPinSetup,
      isNew: !user.pinHash && !user.lastLoginAt,
      user: {
        id: user.id,
        phone: user.phoneLocal,
        name: user.name,
        role: user.role,
        hasPin: Boolean(user.pinHash),
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
