import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toE164, toLocalPhone } from "@/lib/phone";

/** Check whether a phone is registered and has a login PIN */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = String(body.phone || "");
    const e164 = toE164(raw);
    const local = toLocalPhone(raw);
    if (!e164 || !local) {
      return NextResponse.json(
        { error: "Enter a valid Nigerian phone number" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone: e164 },
      select: { id: true, pinHash: true, isActive: true, name: true },
    });

    if (user && !user.isActive) {
      return NextResponse.json(
        { error: "This account is suspended. Contact support." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      phone: e164,
      phoneLocal: local,
      exists: Boolean(user),
      hasPin: Boolean(user?.pinHash),
      isNew: !user,
    });
  } catch (err) {
    console.error("[auth/lookup]", err);
    return NextResponse.json(
      { error: "Could not check number. Try again." },
      { status: 500 }
    );
  }
}
