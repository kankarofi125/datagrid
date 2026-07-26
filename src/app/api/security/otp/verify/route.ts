import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { verifyOtp } from "@/lib/auth/otp";
import {
  getPendingSecurity,
  markSecurityVerified,
  type SecurityPurpose,
} from "@/lib/auth/security-action";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CacheKeys, invalidate } from "@/lib/cache";

/**
 * Confirm OTP for pin_change (phone) or email_change (target email).
 *
 * For email_change: verifies the code AND saves the email on the user in one
 * step (avoids a second PATCH that could fail session/cache races).
 * For pin_change: only marks pendingSecurity.verified for the PIN form to finish.
 */
export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const purpose = String(body.purpose || "") as SecurityPurpose;
  const code = String(body.code || "").trim();

  if (purpose !== "pin_change" && purpose !== "email_change") {
    return NextResponse.json({ error: "Invalid security purpose" }, { status: 400 });
  }
  if (!/^\d{4,8}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
  }

  const pending = getPendingSecurity(session, purpose);
  if (!pending || pending.userId !== session.userId) {
    return NextResponse.json(
      {
        error: "Verification expired. Request a new code.",
        code: "SECURITY_EXPIRED",
      },
      { status: 401 }
    );
  }

  if (purpose === "pin_change") {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { phone: true },
    });
    if (!user?.phone) {
      return NextResponse.json({ error: "Account has no phone" }, { status: 400 });
    }
    const result = await verifyOtp(user.phone, code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await markSecurityVerified(session, purpose);

    return NextResponse.json({
      ok: true,
      purpose,
      verified: true,
      saved: false,
      destinationHint: pending.destinationHint,
      message: "Verified. Choose your new PIN.",
    });
  }

  // ---- email_change: verify code + persist email atomically ----
  const targetEmail = (pending.targetEmail || "").trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes("@")) {
    return NextResponse.json(
      { error: "No email pending verification. Start again." },
      { status: 400 }
    );
  }

  const result = await verifyOtp(targetEmail, code, { email: targetEmail });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { email: targetEmail },
      select: { name: true, email: true, totpEnabled: true },
    });

    delete session.pendingSecurity;
    await session.save();

    await invalidate([
      CacheKeys.userProfile(session.userId),
      CacheKeys.dashboard(session.userId),
      CacheKeys.appShell(session.userId),
    ]);
    revalidatePath("/settings");
    revalidatePath("/(app)/settings", "page");

    console.info("[security/otp/verify] email saved", {
      userId: session.userId,
      email: targetEmail.replace(/^(.{1,2}).*(@.*)$/, "$1***$2"),
    });

    return NextResponse.json({
      ok: true,
      purpose,
      verified: true,
      saved: true,
      email: user.email,
      user,
      destinationHint: pending.destinationHint,
      message: "Email verified and saved. You can enable email 2FA now.",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "That email is already connected to another account.",
          code: "EMAIL_IN_USE",
        },
        { status: 409 }
      );
    }
    console.error("[security/otp/verify] email save failed", error);
    // Code was valid — keep verified flag so a retry PATCH can still work.
    await markSecurityVerified(session, purpose);
    return NextResponse.json(
      {
        error: "Code was correct but saving failed. Tap save again or retry.",
        code: "SAVE_FAILED",
        verified: true,
        targetEmail,
      },
      { status: 500 }
    );
  }
}
