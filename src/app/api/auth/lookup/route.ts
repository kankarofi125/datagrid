import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toE164, toLocalPhone } from "@/lib/phone";
import {
  maskEmail,
  normalizeEmail,
} from "@/lib/auth/resolve-identifier";

/**
 * Check whether a phone or email is registered (login entry).
 * Does not create accounts.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPhone = String(body.phone || "").trim();
    const email = normalizeEmail(String(body.email || ""));

    if (email && !rawPhone) {
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: {
          id: true,
          pinHash: true,
          isActive: true,
          name: true,
          email: true,
          phoneLocal: true,
          totpEnabled: true,
        },
      });

      if (user && !user.isActive) {
        return NextResponse.json(
          { error: "This account is suspended. Contact support." },
          { status: 403 }
        );
      }

      return NextResponse.json({
        ok: true,
        identifierType: "email" as const,
        emailHint: user?.email ? maskEmail(user.email) : maskEmail(email),
        exists: Boolean(user),
        hasPin: Boolean(user?.pinHash),
        email2fa: Boolean(user?.totpEnabled && user?.email),
        isNew: !user,
        phoneLocal: user?.phoneLocal || null,
      });
    }

    const e164 = toE164(rawPhone);
    const local = toLocalPhone(rawPhone);
    if (!e164 || !local) {
      return NextResponse.json(
        { error: "Enter a valid Nigerian phone number" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone: e164 },
      select: {
        id: true,
        pinHash: true,
        isActive: true,
        name: true,
        email: true,
        totpEnabled: true,
      },
    });

    if (user && !user.isActive) {
      return NextResponse.json(
        { error: "This account is suspended. Contact support." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      identifierType: "phone" as const,
      phone: e164,
      phoneLocal: local,
      emailHint: user?.email ? maskEmail(user.email) : null,
      exists: Boolean(user),
      hasPin: Boolean(user?.pinHash),
      email2fa: Boolean(user?.totpEnabled && user?.email),
      isNew: !user,
    });
  } catch (err) {
    console.error("[auth/lookup]", err);
    return NextResponse.json(
      { error: "Could not check account. Try again." },
      { status: 500 }
    );
  }
}
