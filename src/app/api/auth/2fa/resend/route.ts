import { NextResponse } from "next/server";
import { OTP_TTL_MS, requestOtp } from "@/lib/auth/otp";
import { PENDING_2FA_SESSION_MS } from "@/lib/auth/resolve-account-phone";
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

  const expiresInSec =
    "expiresInSec" in otp && typeof otp.expiresInSec === "number"
      ? otp.expiresInSec
      : Math.floor(OTP_TTL_MS / 1000);

  // Refresh identity window (20 min) — do not shrink to the 2‑min code TTL.
  session.pendingLogin2fa = {
    ...pending,
    expiresAt: Date.now() + PENDING_2FA_SESSION_MS,
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
    expiresInSec,
    message: `Code resent to ${hint}`,
  });
}
