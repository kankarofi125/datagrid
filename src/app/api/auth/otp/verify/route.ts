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
    const pending2fa =
      session.pendingLogin2fa && session.pendingLogin2fa.expiresAt > Date.now()
        ? session.pendingLogin2fa
        : undefined;

    // --- Login email 2FA (after PIN or Google) ---
    if (body.login2fa === true || (pending2fa && body.purpose === "login2fa")) {
      if (!pending2fa) {
        delete session.pendingLogin2fa;
        await session.save();
        return NextResponse.json(
          {
            error: "Your 2FA step expired. Sign in again.",
            code: "2FA_EXPIRED",
            recovery: "start",
          },
          { status: 401 }
        );
      }

      const result = await verifyOtp(pending2fa.email, code, {
        email: pending2fa.email,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { id: pending2fa.userId },
        select: { isActive: true, pinHash: true },
      });
      if (!user || !user.isActive) {
        delete session.pendingLogin2fa;
        await session.save();
        return NextResponse.json(
          {
            error: "This account is suspended. Contact support.",
            code: "ACCOUNT_SUSPENDED",
          },
          { status: 403 }
        );
      }

      await prisma.user.update({
        where: { id: pending2fa.userId },
        data: { lastLoginAt: new Date() },
      });

      delete session.pendingLogin2fa;
      delete session.pendingGoogle;
      delete session.adminUsername;
      session.userId = pending2fa.userId;
      session.phone = pending2fa.phone;
      session.role = pending2fa.role;
      session.isLoggedIn = true;
      session.needsPinSetup = !user.pinHash;
      await session.save();

      return NextResponse.json({
        ok: true,
        needsPinSetup: !user.pinHash,
        login2fa: true,
        user: {
          id: pending2fa.userId,
          phone: pending2fa.phone,
          name: pending2fa.name,
          role: pending2fa.role,
        },
      });
    }

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

    // Suspended accounts cannot complete OTP login.
    if (user && !user.isActive) {
      return NextResponse.json(
        {
          error: "This account is suspended. Contact support.",
          code: "ACCOUNT_SUSPENDED",
        },
        { status: 403 }
      );
    }

    /**
     * Email 2FA enforcement:
     * If the account has email 2FA on, phone OTP may only complete login when
     * the user already passed first factor (pendingLogin2fa after PIN/Google).
     * Exception: Google phone-link (pendingGoogle) is a first-time link flow.
     * Exception: new users / users without PIN still need OTP onboarding.
     */
    if (
      user &&
      user.totpEnabled &&
      user.email &&
      user.pinHash &&
      !pendingGoogle
    ) {
      const firstFactorOk =
        pending2fa &&
        pending2fa.userId === user.id &&
        pending2fa.expiresAt > Date.now();

      if (!firstFactorOk) {
        return NextResponse.json(
          {
            error:
              "Email 2FA is on for this account. Enter your PIN first, then use the email code (or phone OTP after PIN).",
            code: "2FA_FIRST_FACTOR_REQUIRED",
          },
          { status: 403 }
        );
      }
    }

    // Phone OTP used as second factor after PIN/Google — match parked account.
    if (pending2fa && !pendingGoogle) {
      if (pending2fa.userId && user && user.id !== pending2fa.userId) {
        return NextResponse.json(
          {
            error: "That code is for a different line. Start sign-in again.",
            code: "2FA_PHONE_MISMATCH",
          },
          { status: 403 }
        );
      }
      // Prefer parked user if OTP phone matches pending
      if (!user && pending2fa.phone) {
        user = await prisma.user.findUnique({
          where: { phone: pending2fa.phone },
        });
      }
    }

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
    let createdNew = false;
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
      createdNew = true;
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

    const needsPinSetup = !user.pinHash;

    session.userId = user.id;
    session.phone = user.phone;
    session.role = user.role;
    delete session.adminUsername;
    delete session.pendingGoogle;
    delete session.pendingLogin2fa;
    session.isLoggedIn = true;
    session.needsPinSetup = needsPinSetup;
    await session.save();

    return NextResponse.json({
      ok: true,
      needsPinSetup,
      isNew: createdNew || needsPinSetup,
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
