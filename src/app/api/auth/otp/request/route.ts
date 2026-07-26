import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp";
import { resolveAccountPhoneFromSession } from "@/lib/auth/resolve-account-phone";
import { prisma } from "@/lib/db";
import { toE164, toLocalPhone } from "@/lib/phone";
import { getSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let phone = String(body.phone || "");
    const session = await getSession();

    if (body.googleLink === true) {
      if (
        !session.pendingGoogle ||
        session.pendingGoogle.expiresAt <= Date.now()
      ) {
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

    // "Use OTP instead" after Google / email 2FA: always load phone from DB
    // via parked userId / email / googleSub (ignore empty client form).
    if (useSessionPhone) {
      const resolved = await resolveAccountPhoneFromSession(session, {
        // Never trust client phone for this path — use account linkage.
        clientPhone: "",
      });

      if (!resolved.ok) {
        console.warn("[otp/request] phone resolve failed", {
          code: resolved.code,
          hasPending2fa: Boolean(session.pendingLogin2fa),
          pendingUserId: session.pendingLogin2fa?.userId,
          pendingEmail: session.pendingLogin2fa?.email
            ? session.pendingLogin2fa.email.replace(/^(.{1,2}).*(@.*)$/, "$1***$2")
            : null,
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

      console.info("[otp/request] phone resolved from account", {
        source: resolved.result.source,
        userId: resolved.result.userId || undefined,
        phoneLast4: resolved.result.phone.replace(/\D/g, "").slice(-4),
      });
    }

    // channels override: e.g. "whatsapp" for "Use OTP instead" (WA → SMS fallback).
    const channels =
      typeof body.channels === "string" && body.channels.trim()
        ? body.channels.trim()
        : undefined;

    const result = await requestOtp({
      phone,
      channels,
      skipCooldown: body.skipCooldown === true,
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

    return NextResponse.json({
      ok: true,
      phone: result.phone,
      phoneLocal: result.phoneLocal || toLocalPhone(e164),
      email: "email" in result ? result.email : undefined,
      channels: "channels" in result ? result.channels : undefined,
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
