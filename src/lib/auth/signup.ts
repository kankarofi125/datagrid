import "server-only";

import { customAlphabet } from "nanoid";
import type { IronSession } from "iron-session";
import { prisma } from "@/lib/db";
import { toE164, toLocalPhone } from "@/lib/phone";
import {
  PENDING_SIGNUP_MS,
  type SessionData,
} from "@/lib/auth/session";
import { CacheKeys, invalidate } from "@/lib/cache";
import { normalizeEmail } from "@/lib/auth/resolve-identifier";

const refCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export function validateSignupName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 70) return null;
  return name;
}

export type SignupFields = {
  name: string;
  email: string;
  phone: string;
  phoneLocal: string;
  referral?: string;
};

export function parseSignupFields(body: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  referral?: unknown;
}):
  | { ok: true; fields: SignupFields }
  | { ok: false; error: string; code?: string } {
  const name = validateSignupName(String(body.name || ""));
  if (!name) {
    return {
      ok: false,
      error: "Enter your full name (at least 2 characters)",
      code: "INVALID_NAME",
    };
  }
  const email = normalizeEmail(String(body.email || ""));
  if (!email) {
    return {
      ok: false,
      error: "Enter a valid email address",
      code: "INVALID_EMAIL",
    };
  }
  const rawPhone = String(body.phone || "");
  const phone = toE164(rawPhone);
  const phoneLocal = toLocalPhone(rawPhone);
  if (!phone || !phoneLocal) {
    return {
      ok: false,
      error: "Enter a valid 11-digit Nigerian phone number",
      code: "INVALID_PHONE",
    };
  }
  const referral = body.referral
    ? String(body.referral).trim().toUpperCase() || undefined
    : undefined;
  return {
    ok: true,
    fields: { name, email, phone, phoneLocal, referral },
  };
}

/**
 * Ensure phone and email are free before parking signup or creating user.
 */
export async function assertSignupIdentifiersFree(
  phone: string,
  email: string
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  const [byPhone, byEmail] = await Promise.all([
    prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    }),
  ]);
  if (byPhone) {
    return {
      ok: false,
      error: "This number already has an account. Sign in instead.",
      code: "PHONE_TAKEN",
    };
  }
  if (byEmail) {
    return {
      ok: false,
      error: "This email is already registered. Sign in with email.",
      code: "EMAIL_TAKEN",
    };
  }
  return { ok: true };
}

export function parkPendingSignup(
  session: IronSession<SessionData>,
  fields: SignupFields & {
    googleSub?: string;
    googleAvatar?: string;
    phoneVerified?: boolean;
    emailVerified?: boolean;
  }
) {
  session.pendingSignup = {
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    phoneLocal: fields.phoneLocal,
    referral: fields.referral,
    phoneVerified: Boolean(fields.phoneVerified),
    emailVerified: Boolean(fields.emailVerified),
    googleSub: fields.googleSub,
    googleAvatar: fields.googleAvatar,
    expiresAt: Date.now() + PENDING_SIGNUP_MS,
  };
}

/**
 * Create user + wallets after phone + email verification.
 */
export async function createUserFromSignup(
  pending: NonNullable<SessionData["pendingSignup"]>
) {
  const free = await assertSignupIdentifiersFree(pending.phone, pending.email);
  if (!free.ok) return free;

  let referredById: string | undefined;
  if (pending.referral) {
    const ref = await prisma.user.findUnique({
      where: { referralCode: pending.referral.toUpperCase() },
      select: { id: true },
    });
    if (ref) referredById = ref.id;
  }

  const user = await prisma.user.create({
    data: {
      phone: pending.phone,
      phoneLocal: pending.phoneLocal,
      email: pending.email,
      name: pending.name,
      googleSub: pending.googleSub || null,
      googleAvatar: pending.googleAvatar || null,
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

  return { ok: true as const, user };
}
