import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth/otp";
import {
  getPendingSecurity,
  markSecurityVerified,
  type SecurityPurpose,
} from "@/lib/auth/security-action";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/**
 * Confirm OTP for pin_change (phone) or email_change (target email).
 * Marks pendingSecurity.verified so the client can complete the action.
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
    return NextResponse.json({ error: "Enter the 4-digit code" }, { status: 400 });
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
  } else {
    const email = pending.targetEmail;
    if (!email) {
      return NextResponse.json(
        { error: "No email pending verification. Start again." },
        { status: 400 }
      );
    }
    const result = await verifyOtp(email, code, { email });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  await markSecurityVerified(session, purpose);

  return NextResponse.json({
    ok: true,
    purpose,
    verified: true,
    destinationHint: pending.destinationHint,
    targetEmail: pending.targetEmail,
    message: "Verified. You can finish this change now.",
  });
}
