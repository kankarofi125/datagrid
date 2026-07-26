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
    if (body.googleLink === true && !pendingGoogle) {
      delete session.pendingGoogle;
      await session.save();
      return NextResponse.json(
        {
          error: "Your Google sign-in expired. Please continue with Google again.",
          code: "GOOGLE_LINK_EXPIRED",
        },
        { status: 401 }
      );
    }
    const referral = body.referral
      ? String(body.referral)
      : pendingGoogle?.referral;

    const result = await verifyOtp(phone, code, {
      email: body.email ? String(body.email) : undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { phone: result.phone } });
    let googleOwner: { id: string } | null = null;
    let emailOwner: { id: string } | null = null;
    if (pendingGoogle) {
      [googleOwner, emailOwner] = await Promise.all([
        prisma.user.findUnique({
          where: { googleSub: pendingGoogle.sub },
          select: { id: true },
        }),
        prisma.user.findFirst({
          where: {
            email: { equals: pendingGoogle.email, mode: "insensitive" },
          },
          select: { id: true },
        }),
      ]);

      // Google identity already belongs to a different phone account.
      if (googleOwner && googleOwner.id !== user?.id) {
        return NextResponse.json(
          {
            error:
              "This Google account is already linked to another DataGrid account. Use Continue with Google to sign in.",
            code: "GOOGLE_ALREADY_LINKED",
          },
          { status: 409 }
        );
      }
      // Email already on a different account — that account should sign in via Google.
      if (emailOwner && emailOwner.id !== user?.id) {
        return NextResponse.json(
          {
            error:
              "This Google email is already on another DataGrid account. Use Continue with Google to sign in to that account.",
            code: "GOOGLE_EMAIL_IN_USE",
          },
          { status: 409 }
        );
      }
    }

    let referredById: string | undefined;
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
          lastLoginAt: new Date(),
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
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleSub: pendingGoogle.sub,
          googleAvatar: pendingGoogle.picture,
          name: user.name || pendingGoogle.name || null,
          email: pendingGoogle.email,
          lastLoginAt: new Date(),
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
