import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp";
import { prisma } from "@/lib/db";
import { toE164, toLocalPhone } from "@/lib/phone";
import { getSession } from "@/lib/auth/session";

/**
 * Resolve phone for "Use OTP instead" after Google / email 2FA.
 * Only uses identities already verified in session (never raw client email alone).
 */
async function resolvePhoneFromSession(opts: {
  phone: string;
  useSessionPhone: boolean;
}): Promise<
  | { ok: true; phone: string; source: string }
  | { ok: false; error: string }
> {
  if (opts.phone.trim()) {
    return { ok: true, phone: opts.phone.trim(), source: "client" };
  }
  if (!opts.useSessionPhone) {
    return { ok: false, error: "Enter a valid Nigerian phone number" };
  }

  const session = await getSession();
  const pending2fa =
    session.pendingLogin2fa && session.pendingLogin2fa.expiresAt > Date.now()
      ? session.pendingLogin2fa
      : null;
  const pendingGoogle =
    session.pendingGoogle && session.pendingGoogle.expiresAt > Date.now()
      ? session.pendingGoogle
      : null;

  if (pending2fa?.phone?.trim()) {
    return {
      ok: true,
      phone: pending2fa.phone.trim(),
      source: "pendingLogin2fa.phone",
    };
  }

  // Look up phone from the verified Google/2FA email on the account.
  const emails: string[] = [];
  if (pending2fa?.email) emails.push(pending2fa.email);
  if (pendingGoogle?.email) emails.push(pendingGoogle.email);

  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email.includes("@")) continue;

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        isActive: true,
      },
      select: { phone: true, id: true },
    });

    if (user?.phone) {
      // Refresh pending 2fa phone cache if we only had email.
      if (pending2fa && !pending2fa.phone) {
        session.pendingLogin2fa = {
          ...pending2fa,
          phone: user.phone,
        };
        await session.save();
      }
      console.info("[otp/request] resolved phone from email", {
        email: email.replace(/^(.{1,2}).*(@.*)$/, "$1***$2"),
        userId: user.id,
        source: pending2fa ? "pendingLogin2fa.email" : "pendingGoogle.email",
      });
      return {
        ok: true,
        phone: user.phone,
        source: pending2fa ? "pendingLogin2fa.email" : "pendingGoogle.email",
      };
    }
  }

  return {
    ok: false,
    error:
      "No phone number linked to this Google account. Enter your line on the login form, or contact support.",
  };
}

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
    const resolved = await resolvePhoneFromSession({
      phone,
      useSessionPhone,
    });
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    phone = resolved.phone;

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
      resolvedFrom: resolved.source,
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
