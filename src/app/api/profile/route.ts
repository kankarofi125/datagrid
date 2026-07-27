import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  consumeSecurityAction,
  requireVerifiedSecurity,
} from "@/lib/auth/security-action";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CacheKeys, invalidate } from "@/lib/cache";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET full customer profile — powers web settings + Flutter profile hub.
 * Mirrors `loadProfile` on the settings page (counts, KYC, security flags).
 */
export async function GET() {
  const session = await requireUser({ allowWithoutPin: true });
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, activeApiKeys] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        name: true,
        email: true,
        phoneLocal: true,
        phone: true,
        referralCode: true,
        kycTier: true,
        kycStatus: true,
        role: true,
        lifetimeVolume: true,
        pinHash: true,
        totpEnabled: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            transactions: true,
            beneficiaries: true,
            schedules: true,
            referrals: true,
            tickets: true,
          },
        },
      },
    }),
    prisma.apiKey.count({ where: { userId: session.userId, revokedAt: null } }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hasPin = Boolean(user.pinHash);
  const completionParts = [
    Boolean(user.name),
    Boolean(user.email),
    hasPin,
    user.kycStatus === "APPROVED",
    user.totpEnabled,
  ];
  const completion = Math.round(
    (completionParts.filter(Boolean).length / completionParts.length) * 100
  );

  return NextResponse.json({
    name: user.name,
    email: user.email,
    phoneLocal: user.phoneLocal,
    phone: user.phone,
    referralCode: user.referralCode,
    kycTier: user.kycTier,
    kycStatus: user.kycStatus,
    role: user.role,
    lifetimeVolume: Number(user.lifetimeVolume),
    hasPin,
    totpEnabled: user.totpEnabled,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
    activeApiKeys,
    counts: {
      transactions: user._count.transactions,
      beneficiaries: user._count.beneficiaries,
      schedules: user._count.schedules,
      referrals: user._count.referrals,
      tickets: user._count.tickets,
    },
    completion,
  });
}

/**
 * PATCH profile.
 * - Name-only updates: free.
 * - Email add/change: requires verified security OTP for that email.
 */
export async function PATCH(request: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const nameRaw = body.name !== undefined ? String(body.name || "").trim() : undefined;
  const emailRaw =
    body.email !== undefined ? String(body.email || "").trim().toLowerCase() : undefined;

  if (nameRaw !== undefined && nameRaw && (nameRaw.length < 2 || nameRaw.length > 70)) {
    return NextResponse.json(
      { error: "Name must be between 2 and 70 characters." },
      { status: 400 }
    );
  }
  if (
    emailRaw !== undefined &&
    emailRaw &&
    (emailRaw.length > 120 || !EMAIL_PATTERN.test(emailRaw))
  ) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextName = nameRaw !== undefined ? nameRaw || null : existing.name;
  const nextEmail =
    emailRaw !== undefined ? emailRaw || null : existing.email;

  const emailChanging =
    emailRaw !== undefined &&
    (nextEmail || "").toLowerCase() !== (existing.email || "").toLowerCase();

  // Clearing email: allow without OTP, but turn off 2FA if enabled.
  // Adding/changing to a new address: OTP required.
  if (emailChanging && nextEmail) {
    const gate = requireVerifiedSecurity(session, "email_change", {
      targetEmail: nextEmail,
    });
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.error, code: "OTP_REQUIRED" },
        { status: 403 }
      );
    }
  }

  try {
    const data: { name?: string | null; email?: string | null; totpEnabled?: boolean } =
      {};
    if (nameRaw !== undefined) data.name = nextName;
    if (emailRaw !== undefined) {
      data.email = nextEmail;
      if (!nextEmail) {
        data.totpEnabled = false;
      }
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data,
      select: { name: true, email: true, totpEnabled: true },
    });

    if (emailChanging && nextEmail) {
      await consumeSecurityAction(session, "email_change");
    }

    await invalidate([
      CacheKeys.userProfile(session.userId),
      CacheKeys.dashboard(session.userId),
      CacheKeys.appShell(session.userId),
    ]);
    revalidatePath("/settings");

    return NextResponse.json({
      ok: true,
      user,
      emailVerified: emailChanging && Boolean(nextEmail),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That email address is already connected to another account." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Could not update your profile right now." },
      { status: 500 }
    );
  }
}
