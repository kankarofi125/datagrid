import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { verifyPin } from "@/lib/auth/pin";
import { CacheKeys, invalidate } from "@/lib/cache";

/**
 * Toggle email login 2FA (User.totpEnabled).
 * Enabling requires a verified email.
 * Disabling requires transaction PIN step-up (stolen session protection).
 */
export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      totpEnabled: true,
      pinHash: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (enabled && (!user.email || !user.email.includes("@"))) {
    return NextResponse.json(
      {
        error: "Add an email address to your profile before enabling email 2FA.",
        code: "EMAIL_REQUIRED",
      },
      { status: 400 }
    );
  }

  // Step-up: disabling 2FA requires correct PIN
  if (!enabled && user.totpEnabled) {
    const pin = String(body.pin || "");
    if (!user.pinHash || !(await verifyPin(pin, user.pinHash))) {
      return NextResponse.json(
        {
          error: "Enter your transaction PIN to turn off email 2FA.",
          code: "PIN_REQUIRED",
        },
        { status: 401 }
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: enabled },
    select: { totpEnabled: true, email: true },
  });

  await invalidate([
    CacheKeys.userProfile(session.userId),
    CacheKeys.dashboard(session.userId),
  ]);

  return NextResponse.json({
    ok: true,
    enabled: updated.totpEnabled,
    email: updated.email,
  });
}

export async function GET() {
  const session = await requireUser({ allowWithoutPin: true });
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { totpEnabled: true, email: true },
  });
  return NextResponse.json({
    ok: true,
    enabled: Boolean(user?.totpEnabled),
    email: user?.email || null,
  });
}
