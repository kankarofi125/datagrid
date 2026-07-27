import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp";
import { resolveAccountPhoneFromSession } from "@/lib/auth/resolve-account-phone";
import {
  maskEmail,
  normalizeEmail,
  resolveUserByIdentifier,
} from "@/lib/auth/resolve-identifier";
import { prisma } from "@/lib/db";
import { toE164, toLocalPhone } from "@/lib/phone";
import { getSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let phone = String(body.phone || "");
    const emailInput = normalizeEmail(String(body.email || ""));
    const session = await getSession();

    const pendingGoogleLive =
      session.pendingGoogle && session.pendingGoogle.expiresAt > Date.now()
        ? session.pendingGoogle
        : null;
    const pending2faLive =
      session.pendingLogin2fa && session.pendingLogin2fa.expiresAt > Date.now()
        ? session.pendingLogin2fa
        : null;

    if (body.googleLink === true) {
      if (!pendingGoogleLive) {
        delete session.pendingGoogle;
        await session.save();
        return NextResponse.json(
          {
            error:
              "Your Google sign-in expired. Please continue with Google again.",
            code: "GOOGLE_LINK_EXPIRED",
          },
          { status: 401 }
        );
      }
    }

    const useSessionPhone = body.useSessionPhone === true;

    // "Use OTP instead" after Google / email 2FA — only with first factor parked.
    if (useSessionPhone) {
      if (!pending2faLive && !pendingGoogleLive) {
        return NextResponse.json(
          {
            error:
              "Sign-in session expired. Enter your PIN or continue with Google first.",
            code: "SESSION_EXPIRED",
          },
          { status: 401 }
        );
      }

      const resolved = await resolveAccountPhoneFromSession(session, {
        clientPhone: "",
      });

      if (!resolved.ok) {
        console.warn("[otp/request] phone resolve failed", {
          code: resolved.code,
          hasPending2fa: Boolean(session.pendingLogin2fa),
          pendingUserId: session.pendingLogin2fa?.userId,
          hasPendingGoogle: Boolean(session.pendingGoogle),
        });
        return NextResponse.json(
          { error: resolved.error, code: resolved.code },
          { status: 400 }
        );
      }

      phone = resolved.result.phone;

      if (session.pendingLogin2fa && resolved.result.userId) {
        session.pendingLogin2fa = {
          ...session.pendingLogin2fa,
          phone: resolved.result.phone,
          email: resolved.result.email || session.pendingLogin2fa.email,
        };
        await session.save();
      }
    }

    // --- Email-identifier login OTP (existing accounts only) ---
    if (emailInput && !phone && !useSessionPhone) {
      const resolved = await resolveUserByIdentifier({ email: emailInput });
      if (!resolved.ok) {
        return NextResponse.json(
          {
            error:
              "No account for this email. Create an account to join the grid.",
            code: "ACCOUNT_REQUIRED",
            signup: true,
          },
          { status: 404 }
        );
      }
      const user = resolved.user;
      if (!user.isActive) {
        return NextResponse.json(
          {
            error: "This account is suspended. Contact support.",
            code: "ACCOUNT_SUSPENDED",
          },
          { status: 403 }
        );
      }
      if (user.totpEnabled && user.pinHash && !pending2faLive) {
        return NextResponse.json(
          {
            error:
              "This account uses email 2FA. Enter your PIN first, then complete the email code.",
            code: "2FA_PIN_REQUIRED",
          },
          { status: 403 }
        );
      }

      const result = await requestOtp({
        email: user.email || emailInput,
        channels: "email",
        firstName: user.name?.split(" ")[0],
        skipCooldown:
          body.skipCooldown === true && Boolean(pending2faLive),
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, cooldownSec: result.cooldownSec },
          { status: 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        identifierType: "email",
        emailHint: maskEmail(user.email || emailInput),
        phone: user.phone,
        phoneLocal: user.phoneLocal,
        channels: "channels" in result ? result.channels : ["email"],
        channelHint: "email",
        expiresInSec: "expiresInSec" in result ? result.expiresInSec : 120,
        exists: true,
        hasPin: Boolean(user.pinHash),
        isNew: false,
      });
    }

    const e164Preview = toE164(phone);
    if (e164Preview) {
      const existing = await prisma.user.findUnique({
        where: { phone: e164Preview },
        select: {
          isActive: true,
          totpEnabled: true,
          email: true,
          pinHash: true,
        },
      });
      if (existing && !existing.isActive) {
        return NextResponse.json(
          {
            error: "This account is suspended. Contact support.",
            code: "ACCOUNT_SUSPENDED",
          },
          { status: 403 }
        );
      }
      // Block public OTP as sole login when email 2FA is on (must use PIN first).
      if (
        existing?.totpEnabled &&
        existing.email &&
        existing.pinHash &&
        !useSessionPhone &&
        !pendingGoogleLive &&
        body.googleLink !== true
      ) {
        return NextResponse.json(
          {
            error:
              "This account uses email 2FA. Enter your PIN first, then complete the email code.",
            code: "2FA_PIN_REQUIRED",
          },
          { status: 403 }
        );
      }
      // Login OTP for unknown phone (not Google link) — send them to signup.
      if (
        !existing &&
        !pendingGoogleLive &&
        body.googleLink !== true &&
        body.allowNew !== true
      ) {
        return NextResponse.json(
          {
            error:
              "No account for this number. Create an account with your name, email, and phone.",
            code: "ACCOUNT_REQUIRED",
            signup: true,
            phoneLocal: toLocalPhone(phone),
          },
          { status: 404 }
        );
      }
    }

    const allowSkipCooldown =
      body.skipCooldown === true &&
      (Boolean(pending2faLive) || Boolean(pendingGoogleLive));

    const channels =
      typeof body.channels === "string" && body.channels.trim()
        ? body.channels.trim()
        : undefined;

    const result = await requestOtp({
      phone,
      channels,
      skipCooldown: allowSkipCooldown,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, cooldownSec: result.cooldownSec },
        { status: 400 }
      );
    }

    const e164 = toE164(phone) || result.phone;
    const user = await prisma.user.findUnique({
      where: { phone: e164 },
      select: { pinHash: true },
    });

    const delivered = "channels" in result ? result.channels || [] : [];
    const channelHint = delivered.includes("sms")
      ? "SMS"
      : delivered.includes("whatsapp")
        ? "WhatsApp"
        : delivered.includes("email")
          ? "email"
          : null;

    return NextResponse.json({
      ok: true,
      identifierType: "phone",
      phone: result.phone,
      phoneLocal: result.phoneLocal || toLocalPhone(e164),
      email: "email" in result ? result.email : undefined,
      channels: delivered,
      channelHint,
      expiresInSec: "expiresInSec" in result ? result.expiresInSec : 120,
      exists: Boolean(user),
      hasPin: Boolean(user?.pinHash),
      isNew: !user,
    });
  } catch (err) {
    console.error("[otp/request]", err);
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
