import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { hashPin, isValidPin, verifyPin } from "@/lib/auth/pin";
import { CacheKeys, invalidate } from "@/lib/cache";

/** GET — whether user has PIN set */
export async function GET() {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { pinHash: true },
  });
  return NextResponse.json({ hasPin: Boolean(user?.pinHash) });
}

/** POST — set or change PIN */
export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const pin = String(body.pin || "");
  const currentPin = body.currentPin ? String(body.currentPin) : undefined;

  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.pinHash) {
    if (!currentPin || !(await verifyPin(currentPin, user.pinHash))) {
      return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
    }
  }

  const pinHash = await hashPin(pin);
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash },
  });
  await invalidate(CacheKeys.userProfile(user.id));

  return NextResponse.json({ ok: true, hasPin: true });
}
