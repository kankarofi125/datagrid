import { NextResponse } from "next/server";
import {
  consumeSecurityAction,
  requireVerifiedSecurity,
} from "@/lib/auth/security-action";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { hashPin, isValidPin, verifyPin } from "@/lib/auth/pin";
import { CacheKeys, invalidate } from "@/lib/cache";
import { privateJson } from "@/lib/http-cache";

/** GET — whether user has PIN set */
export async function GET() {
  const session = await requireUser({ allowWithoutPin: true });
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { pinHash: true },
  });
  return privateJson({ hasPin: Boolean(user?.pinHash) });
}

/**
 * POST — set or change PIN.
 *
 * - First-time set (no pinHash): pin only (session already authenticated).
 * - Change / reset (has pinHash): requires completed phone OTP
 *   (pendingSecurity purpose=pin_change, verified).
 * - Optional currentPin still accepted as extra check but OTP is required
 *   when changing an existing PIN.
 */
export async function POST(req: Request) {
  const session = await requireUser({ allowWithoutPin: true });
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const pin = String(body.pin || "");
  const currentPin = body.currentPin ? String(body.currentPin) : undefined;

  if (!isValidPin(pin)) {
    return NextResponse.json(
      { error: "PIN must be exactly 4 digits" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.pinHash) {
    const gate = requireVerifiedSecurity(session, "pin_change");
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.error, code: "OTP_REQUIRED" },
        { status: 403 }
      );
    }
    // Optional: if they also provided current PIN, verify it.
    if (currentPin && !(await verifyPin(currentPin, user.pinHash))) {
      return NextResponse.json(
        { error: "Current PIN is incorrect" },
        { status: 401 }
      );
    }
  }

  const pinHash = await hashPin(pin);
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash },
  });
  await invalidate([
    CacheKeys.userProfile(user.id),
    CacheKeys.appShell(user.id),
  ]);

  if (user.pinHash) {
    await consumeSecurityAction(session, "pin_change");
  }

  // First-time onboarding PIN complete — unlock full app.
  if (session.needsPinSetup) {
    delete session.needsPinSetup;
    await session.save();
  }

  return NextResponse.json({
    ok: true,
    hasPin: true,
    changed: Boolean(user.pinHash),
  });
}
