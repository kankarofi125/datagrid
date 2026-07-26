import "server-only";

import type { IronSession } from "iron-session";
import { requestOtp } from "@/lib/auth/otp";
import type { SessionData } from "@/lib/auth/session";

export type Login2faUser = {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: string;
  totpEnabled: boolean;
};

/**
 * Start email 2FA after PIN or Google verified the first factor.
 * Sends Brevo code and stores pendingLogin2fa on the session (not fully logged in).
 */
export async function startEmail2faChallenge(
  session: IronSession<SessionData>,
  user: Login2faUser,
  opts?: { emailOverride?: string; firstName?: string }
): Promise<
  | {
      ok: true;
      emailHint: string;
      email: string;
    }
  | { ok: false; error: string }
> {
  const email = (opts?.emailOverride || user.email || "").trim().toLowerCase();
  if (!user.totpEnabled) {
    return { ok: false, error: "2FA is not enabled for this account" };
  }
  if (!email || !email.includes("@")) {
    return {
      ok: false,
      error: "Add an email on your profile to use email 2FA.",
    };
  }

  const otp = await requestOtp({
    email,
    channels: "email",
    firstName:
      opts?.firstName ||
      user.name?.split(" ")[0] ||
      "Customer",
    skipCooldown: true,
  });

  if (!otp.ok) {
    console.error("[login-2fa] email send failed", otp.error);
    return { ok: false, error: otp.error };
  }

  session.isLoggedIn = false;
  delete session.userId;
  delete session.phone;
  delete session.role;
  delete session.adminUsername;
  delete session.pendingGoogle;
  session.pendingLogin2fa = {
    userId: user.id,
    phone: user.phone,
    email,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  await session.save();

  const [localPart, domain] = email.split("@");
  const emailHint =
    localPart.length <= 2
      ? `*@${domain}`
      : `${localPart[0]}***@${domain}`;

  console.info("[login-2fa] challenge started", {
    userId: user.id,
    emailHint,
    delivered: otp.channels,
    realEmail:
      otp.channels.includes("email") && !otp.channels.includes("email-dev"),
  });

  return {
    ok: true,
    emailHint,
    email,
  };
}

export function email2faLoginPath(result: {
  emailHint: string;
  source?: "google" | "pin";
}): string {
  const qs = new URLSearchParams({
    google: result.source === "google" ? "2fa" : "2fa",
    emailHint: result.emailHint,
  });
  // Keep google=2fa so existing notice + step logic works for both.
  if (result.source === "pin") {
    qs.set("login", "2fa");
  }
  return `/login?${qs.toString()}`;
}
