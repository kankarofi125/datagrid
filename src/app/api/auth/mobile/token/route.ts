import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import {
  issueMobileToken,
  resolveBearerAuth,
  revokeMobileToken,
} from "@/lib/auth/mobile-token";
import { prisma } from "@/lib/db";
import { isValidPin, verifyPin } from "@/lib/auth/pin";
import { resolveUserByIdentifier } from "@/lib/auth/resolve-identifier";
import {
  clearPinFailures,
  getPinLockStatus,
  recordPinFailure,
} from "@/lib/auth/pin-lockout";
import { startEmail2faChallenge } from "@/lib/auth/login-2fa";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import {
  getGoogleAudiences,
  verifyGoogleIdToken,
} from "@/lib/auth/google";
import { maskEmail } from "@/lib/auth/resolve-identifier";

export const runtime = "nodejs";

/**
 * Mobile (Flutter) auth bridge.
 *
 * POST body actions:
 * - { action: "pin", phone?|email?, pin }  → token (or needs2fa)
 * - { action: "otp", phone?|email?, code } → token if account exists
 * - { action: "google", idToken }          → token | needs2fa | needsSignup
 * - { action: "from_session" }             → mint token from web cookie (rare)
 * - { action: "refresh" }                  → Authorization Bearer required
 *
 * DELETE: revoke current bearer token (logout device).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "pin");
    const h = await headers();
    const ua = h.get("user-agent");
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;

    if (action === "google") {
      const idToken = String(body.idToken || "").trim();
      if (!idToken) {
        return NextResponse.json(
          { error: "Google ID token required", code: "ID_TOKEN_REQUIRED" },
          { status: 400 }
        );
      }

      const audiences = getGoogleAudiences();
      if (audiences.length === 0) {
        return NextResponse.json(
          {
            error: "Google Sign-In is not configured on the server.",
            code: "GOOGLE_CONFIG",
          },
          { status: 503 }
        );
      }

      let identity;
      try {
        identity = await verifyGoogleIdToken({
          idToken,
          audiences,
          requireNonce: false,
        });
      } catch (err) {
        console.warn(
          "[auth/mobile/token] google verify failed",
          err instanceof Error ? err.message : err
        );
        return NextResponse.json(
          {
            error: "Could not verify Google account. Try again.",
            code: "GOOGLE_INVALID",
          },
          { status: 401 }
        );
      }

      const bySub = await prisma.user.findUnique({
        where: { googleSub: identity.sub },
      });
      const byEmail =
        bySub ||
        (await prisma.user.findFirst({
          where: {
            email: { equals: identity.email, mode: "insensitive" },
          },
        }));

      if (!byEmail) {
        // New Google identity — Flutter continues to signup with phone proof.
        // Client must re-send idToken on signup/start so we re-verify (no spoof).
        return NextResponse.json({
          ok: true,
          needsSignup: true,
          google: {
            email: identity.email,
            name: identity.name || null,
          },
          message: "Add your Nigerian number to finish creating your account.",
        });
      }

      if (!byEmail.isActive) {
        return NextResponse.json(
          { error: "This account is suspended.", code: "SUSPENDED" },
          { status: 403 }
        );
      }

      if (byEmail.googleSub && byEmail.googleSub !== identity.sub) {
        return NextResponse.json(
          {
            error:
              "That email is linked to a different Google account. Sign in with phone or email.",
            code: "GOOGLE_MISMATCH",
          },
          { status: 409 }
        );
      }

      const email = (byEmail.email || identity.email).trim().toLowerCase();
      await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleSub: identity.sub,
          googleAvatar: identity.picture || byEmail.googleAvatar,
          name: byEmail.name || identity.name || null,
          email,
        },
      });

      if (byEmail.totpEnabled && email) {
        // Prefer email OTP for 2FA without relying on browser cookies.
        const otp = await requestOtp({
          email,
          channels: "email",
          firstName:
            byEmail.name?.split(" ")[0] ||
            identity.name?.split(" ")[0] ||
            "Customer",
        });
        return NextResponse.json({
          ok: true,
          needs2fa: true,
          emailHint: maskEmail(email),
          email: email,
          phone: byEmail.phoneLocal,
          expiresInSec: otp.ok && "expiresInSec" in otp ? otp.expiresInSec : 120,
          emailFailed: !otp.ok,
          message: otp.ok
            ? "Enter the email code to finish signing in."
            : "Email code failed — use phone OTP instead.",
        });
      }

      await prisma.user.update({
        where: { id: byEmail.id },
        data: { lastLoginAt: new Date() },
      });

      const token = await issueMobileToken({
        userId: byEmail.id,
        userAgent: ua,
        ip,
      });

      return NextResponse.json({
        ok: true,
        needs2fa: false,
        needsPinSetup: !byEmail.pinHash,
        user: {
          id: byEmail.id,
          phone: byEmail.phoneLocal,
          name: byEmail.name || identity.name,
          email,
          role: byEmail.role,
        },
        ...token,
      });
    }

    if (action === "from_session") {
      const session = await getSession();
      if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      }
      const token = await issueMobileToken({
        userId: session.userId,
        userAgent: ua,
        ip,
      });
      return NextResponse.json({ ok: true, ...token });
    }

    if (action === "refresh") {
      const current = await resolveBearerAuth({ allowWithoutPin: true });
      if (!current?.userId) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
      if (current.mobileToken) {
        await revokeMobileToken(current.mobileToken);
      }
      const token = await issueMobileToken({
        userId: current.userId,
        userAgent: ua,
        ip,
      });
      return NextResponse.json({ ok: true, ...token });
    }

    if (action === "otp") {
      const phone = body.phone ? String(body.phone) : "";
      const email = body.email ? String(body.email) : "";
      const code = String(body.code || "");
      const result = await verifyOtp(phone || email, code, {
        email: email || undefined,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      let user = result.phone
        ? await prisma.user.findUnique({ where: { phone: result.phone } })
        : null;
      if (!user && result.email) {
        user = await prisma.user.findFirst({
          where: { email: { equals: result.email, mode: "insensitive" } },
        });
      }
      if (!user || !user.isActive) {
        return NextResponse.json(
          {
            error: "No account found. Create an account on the website or app signup.",
            code: "ACCOUNT_REQUIRED",
          },
          { status: 404 }
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = await issueMobileToken({
        userId: user.id,
        userAgent: ua,
        ip,
      });
      return NextResponse.json({
        ok: true,
        needsPinSetup: !user.pinHash,
        user: {
          id: user.id,
          phone: user.phoneLocal,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        ...token,
      });
    }

    // Default: PIN login
    const pin = String(body.pin || "");
    if (!isValidPin(pin)) {
      return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
    }

    const resolved = await resolveUserByIdentifier({
      phone: body.phone ? String(body.phone) : undefined,
      email: body.email ? String(body.email) : undefined,
    });
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error, code: resolved.code },
        { status: resolved.code === "NOT_FOUND" ? 404 : 400 }
      );
    }

    const user = resolved.user;
    if (!user.isActive) {
      return NextResponse.json(
        { error: "This account is suspended." },
        { status: 403 }
      );
    }
    if (!user.pinHash) {
      return NextResponse.json(
        { error: "Set up your PIN first.", code: "PIN_REQUIRED" },
        { status: 400 }
      );
    }

    const lock = await getPinLockStatus(user.phone);
    if (lock.locked) {
      return NextResponse.json(
        {
          error: `Too many incorrect PINs. Try again in ${lock.retryAfterSec}s.`,
          code: "PIN_LOCKED",
          retryAfterSec: lock.retryAfterSec,
        },
        { status: 429 }
      );
    }

    const ok = await verifyPin(pin, user.pinHash);
    if (!ok) {
      const fail = await recordPinFailure(user.phone);
      return NextResponse.json(
        {
          error: "Incorrect PIN",
          attemptsLeft: fail.attemptsLeft,
          code: fail.locked ? "PIN_LOCKED" : undefined,
          retryAfterSec: fail.retryAfterSec,
        },
        { status: fail.locked ? 429 : 401 }
      );
    }
    await clearPinFailures(user.phone);

    if (user.totpEnabled && user.email) {
      // Park 2FA on cookie session for web-compatible verify; mobile uses OTP verify next.
      const session = await getSession();
      const challenge = await startEmail2faChallenge(session, {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        totpEnabled: user.totpEnabled,
      });
      return NextResponse.json({
        ok: true,
        needs2fa: true,
        emailHint: challenge.emailHint,
        expiresInSec: challenge.expiresInSec ?? 120,
        emailFailed: !challenge.ok,
        message: challenge.ok
          ? "Enter the email code"
          : "Email failed — use phone OTP",
        phone: user.phoneLocal,
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await issueMobileToken({
      userId: user.id,
      userAgent: ua,
      ip,
    });

    return NextResponse.json({
      ok: true,
      needs2fa: false,
      needsPinSetup: false,
      user: {
        id: user.id,
        phone: user.phoneLocal,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...token,
    });
  } catch (err) {
    console.error("[auth/mobile/token]", err);
    return NextResponse.json(
      { error: "Mobile auth failed. Try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) {
    await revokeMobileToken(m[1].trim());
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await resolveBearerAuth({ allowWithoutPin: true });
  if (!user) {
    return NextResponse.json({ isLoggedIn: false });
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: { wallets: true },
  });
  if (!dbUser) return NextResponse.json({ isLoggedIn: false });
  const main = dbUser.wallets.find((w) => w.kind === "MAIN");
  return NextResponse.json({
    isLoggedIn: true,
    needsPinSetup: Boolean(user.needsPinSetup),
    user: {
      id: dbUser.id,
      phone: dbUser.phoneLocal,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      referralCode: dbUser.referralCode,
      balance: Number(main?.balance ?? 0),
    },
  });
}
