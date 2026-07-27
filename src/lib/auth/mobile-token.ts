import "server-only";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/** Mobile access tokens last 30 days (refreshed on use optionally). */
export const MOBILE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type MobileAuthUser = {
  userId: string;
  phone: string;
  role: string;
  isLoggedIn: true;
  needsPinSetup?: boolean;
  /** Present so callers that only need identity work for cookie + bearer. */
  mobileToken?: string;
};

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

/** Issue a new mobile device token after successful login / PIN setup. */
export async function issueMobileToken(input: {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
}) {
  const raw = `dgm_${randomBytes(32).toString("base64url")}`;
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + MOBILE_TOKEN_TTL_MS);

  await prisma.session.create({
    data: {
      userId: input.userId,
      tokenHash,
      expiresAt,
      userAgent: input.userAgent?.slice(0, 280) || null,
      ip: input.ip?.slice(0, 64) || null,
    },
  });

  return {
    accessToken: raw,
    tokenType: "Bearer" as const,
    expiresAt: expiresAt.toISOString(),
    expiresInSec: Math.floor(MOBILE_TOKEN_TTL_MS / 1000),
  };
}

export async function revokeMobileToken(raw: string) {
  const tokenHash = hashToken(raw);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function revokeAllMobileTokens(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * Resolve Authorization: Bearer … against Prisma Session rows.
 */
export async function resolveBearerAuth(opts?: {
  allowWithoutPin?: boolean;
}): Promise<MobileAuthUser | null> {
  const h = await headers();
  const auth = h.get("authorization") || h.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m?.[1]) return null;

  const raw = m[1].trim();
  if (!raw.startsWith("dgm_")) return null;

  const tokenHash = hashToken(raw);
  const row = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          phone: true,
          role: true,
          isActive: true,
          pinHash: true,
        },
      },
    },
  });

  if (!row || row.expiresAt.getTime() <= Date.now()) {
    if (row) {
      await prisma.session.delete({ where: { id: row.id } }).catch(() => null);
    }
    return null;
  }

  const user = row.user;
  if (!user.isActive) return null;

  const needsPin = !user.pinHash;
  if (needsPin && !opts?.allowWithoutPin) {
    return {
      userId: user.id,
      phone: user.phone,
      role: user.role,
      isLoggedIn: true,
      needsPinSetup: true,
      mobileToken: raw,
    };
  }

  // Sliding expiry: extend if more than 1 day consumed
  const remaining = row.expiresAt.getTime() - Date.now();
  if (remaining < MOBILE_TOKEN_TTL_MS - 24 * 60 * 60 * 1000) {
    await prisma.session
      .update({
        where: { id: row.id },
        data: { expiresAt: new Date(Date.now() + MOBILE_TOKEN_TTL_MS) },
      })
      .catch(() => null);
  }

  return {
    userId: user.id,
    phone: user.phone,
    role: user.role,
    isLoggedIn: true,
    needsPinSetup: needsPin || undefined,
    mobileToken: raw,
  };
}
