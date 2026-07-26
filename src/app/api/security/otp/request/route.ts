import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requestOtp } from "@/lib/auth/otp";
import {
  maskDestination,
  parkSecurityOtp,
  type SecurityPurpose,
} from "@/lib/auth/security-action";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Start OTP for a security action:
 * - pin_change  → WhatsApp (SMS fallback) to account phone
 * - email_change → Brevo email to the *new* address
 */
export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const purpose = String(body.purpose || "") as SecurityPurpose;

  if (purpose !== "pin_change" && purpose !== "email_change") {
    return NextResponse.json({ error: "Invalid security purpose" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      phone: true,
      phoneLocal: true,
      email: true,
      name: true,
      isActive: true,
    },
  });

  if (!user?.isActive) {
    return NextResponse.json({ error: "Account not available" }, { status: 403 });
  }

  const firstName = user.name?.split(" ")[0] || "Customer";

  if (purpose === "pin_change") {
    if (!user.phone) {
      return NextResponse.json(
        { error: "No phone on this account. Contact support." },
        { status: 400 }
      );
    }

    const otp = await requestOtp({
      phone: user.phone,
      channels: "whatsapp",
      firstName,
      skipCooldown: body.resend === true,
    });

    if (!otp.ok) {
      return NextResponse.json(
        {
          error: otp.error || "Could not send verification code",
          cooldownSec: "cooldownSec" in otp ? otp.cooldownSec : undefined,
        },
        { status: 400 }
      );
    }

    const hint = maskDestination(user.phoneLocal || user.phone, "phone");
    await parkSecurityOtp(session, {
      purpose: "pin_change",
      userId: user.id,
      destinationHint: hint,
    });

    return NextResponse.json({
      ok: true,
      purpose,
      channel: otp.channels?.[0] || "whatsapp",
      channels: otp.channels,
      destinationHint: hint,
      expiresInSec: otp.expiresInSec ?? 120,
      message: `Code sent via ${
        otp.channels?.includes("sms") ? "SMS" : "WhatsApp"
      } to ${hint}`,
    });
  }

  // email_change — prove ownership of the new inbox
  const targetEmail = String(body.email || "").trim().toLowerCase();
  if (!targetEmail || !EMAIL_PATTERN.test(targetEmail) || targetEmail.length > 120) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 }
    );
  }

  if (user.email && user.email.toLowerCase() === targetEmail) {
    return NextResponse.json(
      { error: "That email is already on your account" },
      { status: 400 }
    );
  }

  const taken = await prisma.user.findFirst({
    where: {
      email: { equals: targetEmail, mode: "insensitive" },
      NOT: { id: user.id },
    },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json(
      { error: "That email is already connected to another account" },
      { status: 409 }
    );
  }

  try {
    const otp = await requestOtp({
      email: targetEmail,
      channels: "email",
      firstName,
      skipCooldown: body.resend === true,
    });

    if (!otp.ok) {
      return NextResponse.json(
        {
          error: otp.error || "Could not send verification email",
          cooldownSec: "cooldownSec" in otp ? otp.cooldownSec : undefined,
        },
        { status: 400 }
      );
    }

    const hint = maskDestination(targetEmail, "email");
    await parkSecurityOtp(session, {
      purpose: "email_change",
      userId: user.id,
      targetEmail,
      destinationHint: hint,
    });

    return NextResponse.json({
      ok: true,
      purpose,
      channel: "email",
      channels: otp.channels,
      destinationHint: hint,
      targetEmail, // client already knows it; used to keep form in sync
      expiresInSec: otp.expiresInSec ?? 120,
      message: `Code sent to ${hint}`,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That email is already connected to another account" },
        { status: 409 }
      );
    }
    throw error;
  }
}
