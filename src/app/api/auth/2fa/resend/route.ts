import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp";
import { getSession } from "@/lib/auth/session";

/** Resend email 2FA code while pendingLogin2fa is active. */
export async function POST() {
  const session = await getSession();
  const pending =
    session.pendingLogin2fa && session.pendingLogin2fa.expiresAt > Date.now()
      ? session.pendingLogin2fa
      : null;

  if (!pending) {
    return NextResponse.json(
      {
        error: "No pending 2FA sign-in. Enter your PIN or use Google again.",
        code: "2FA_EXPIRED",
      },
      { status: 401 }
    );
  }

  const otp = await requestOtp({
    email: pending.email,
    channels: "email",
    firstName: pending.name?.split(" ")[0] || "Customer",
    skipCooldown: true,
  });

  if (!otp.ok) {
    return NextResponse.json(
      { error: otp.error || "Could not resend code" },
      { status: 502 }
    );
  }

  // Refresh 2FA window
  session.pendingLogin2fa = {
    ...pending,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  await session.save();

  const [localPart, domain] = pending.email.split("@");
  const hint =
    localPart.length <= 2
      ? `*@${domain}`
      : `${localPart[0]}***@${domain}`;

  return NextResponse.json({
    ok: true,
    emailHint: hint,
    devHint: otp.devHint,
    message: `Code resent to ${hint}`,
  });
}
