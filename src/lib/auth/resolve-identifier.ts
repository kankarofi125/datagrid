import "server-only";

import { prisma } from "@/lib/db";
import { toE164, toLocalPhone } from "@/lib/phone";

export type IdentifierType = "phone" | "email";

export type ResolvedUser = {
  id: string;
  phone: string;
  phoneLocal: string;
  email: string | null;
  name: string | null;
  role: string;
  pinHash: string | null;
  totpEnabled: boolean;
  isActive: boolean;
  googleSub: string | null;
};

export function normalizeEmail(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return null;
  }
  return email;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  if (user.length <= 2) return `${user[0] || "*"}***@${domain}`;
  return `${user.slice(0, 2)}***@${domain}`;
}

/**
 * Resolve a consumer account by Nigerian phone or verified email.
 */
export async function resolveUserByIdentifier(input: {
  phone?: string;
  email?: string;
}): Promise<
  | { ok: true; type: IdentifierType; user: ResolvedUser }
  | { ok: false; error: string; code?: string }
> {
  const email = normalizeEmail(input.email);
  const rawPhone = String(input.phone || "").trim();
  const e164 = rawPhone ? toE164(rawPhone) : null;

  if (email && !e164) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: {
        id: true,
        phone: true,
        phoneLocal: true,
        email: true,
        name: true,
        role: true,
        pinHash: true,
        totpEnabled: true,
        isActive: true,
        googleSub: true,
      },
    });
    if (!user) {
      return {
        ok: false,
        error: "No account for this email. Create an account to join.",
        code: "NOT_FOUND",
      };
    }
    return { ok: true, type: "email", user: user as ResolvedUser };
  }

  if (e164) {
    const local = toLocalPhone(rawPhone);
    if (!local) {
      return {
        ok: false,
        error: "Enter a valid Nigerian phone number",
        code: "INVALID_PHONE",
      };
    }
    const user = await prisma.user.findUnique({
      where: { phone: e164 },
      select: {
        id: true,
        phone: true,
        phoneLocal: true,
        email: true,
        name: true,
        role: true,
        pinHash: true,
        totpEnabled: true,
        isActive: true,
        googleSub: true,
      },
    });
    if (!user) {
      return {
        ok: false,
        error: "No account for this number. Create an account to join.",
        code: "NOT_FOUND",
      };
    }
    return { ok: true, type: "phone", user: user as ResolvedUser };
  }

  return {
    ok: false,
    error: "Enter a phone number or email",
    code: "INVALID_IDENTIFIER",
  };
}
