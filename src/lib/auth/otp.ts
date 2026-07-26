import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { toE164, toLocalPhone } from "@/lib/phone";
import {
  buildOtpEmailHtml,
  buildOtpEmailSubject,
} from "@/lib/email/templates/otp";
import {
  isSendchampLive,
  sendchampConfirmOtp,
  sendchampSendEmail,
  sendchampSendOtp,
} from "@/lib/sendchamp";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 45_000;
const TOKEN_LENGTH = 4;

export type OtpChannel = "sms" | "email" | "both";

function configuredChannels(): OtpChannel {
  const raw = (process.env.OTP_CHANNELS || "sms").trim().toLowerCase();
  if (raw === "email" || raw === "sms" || raw === "both") return raw;
  return "sms";
}

function isSimulateMode(): boolean {
  return (
    process.env.OTP_MODE === "simulate" ||
    process.env.OTP_MODE === "sim" ||
    !isSendchampLive()
  );
}

export function generateOtpCode(): string {
  if (isSimulateMode()) {
    return process.env.OTP_DEV_CODE || "1234";
  }
  return String(Math.floor(1000 + Math.random() * 9000));
}

function normalizeEmail(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  if (!email.includes("@") || email.length > 254) return null;
  return email;
}

export type RequestOtpInput = {
  phone?: string;
  email?: string;
  /** Override env OTP_CHANNELS for this request */
  channels?: OtpChannel;
  firstName?: string;
};

/**
 * Request an OTP via Sendchamp (SMS and/or email) or simulate in dev.
 */
export async function requestOtp(rawPhoneOrInput: string | RequestOtpInput) {
  const input: RequestOtpInput =
    typeof rawPhoneOrInput === "string"
      ? { phone: rawPhoneOrInput }
      : rawPhoneOrInput;

  const e164 = input.phone ? toE164(input.phone) : null;
  const local = input.phone ? toLocalPhone(input.phone) : null;
  const email = normalizeEmail(input.email);

  const channels = input.channels || configuredChannels();
  const wantSms = channels === "sms" || channels === "both";
  const wantEmail = channels === "email" || channels === "both";

  if (wantSms && (!e164 || !local)) {
    return { ok: false as const, error: "Enter a valid Nigerian phone number" };
  }
  if (wantEmail && !email) {
    // When both: try load email from existing user if only phone provided
    if (wantSms && e164) {
      const user = await prisma.user.findUnique({
        where: { phone: e164 },
        select: { email: true, name: true },
      });
      if (!user?.email) {
        // SMS-only if no email on file for "both"
        if (channels === "both") {
          // fall through with SMS only
        } else {
          return { ok: false as const, error: "Enter a valid email address" };
        }
      }
    } else if (!wantSms) {
      return { ok: false as const, error: "Enter a valid email address" };
    }
  }

  // Resolve email from user when channels=both and phone-only request
  let resolvedEmail = email;
  let firstName = input.firstName || "Customer";
  if (wantEmail && !resolvedEmail && e164) {
    const user = await prisma.user.findUnique({
      where: { phone: e164 },
      select: { email: true, name: true },
    });
    resolvedEmail = user?.email || null;
    if (user?.name) firstName = user.name.split(" ")[0] || firstName;
  }

  const sendSms = wantSms && Boolean(e164);
  const sendEmail = wantEmail && Boolean(resolvedEmail);

  if (!sendSms && !sendEmail) {
    return {
      ok: false as const,
      error:
        channels === "email"
          ? "Enter a valid email address"
          : "Enter a valid Nigerian phone number",
    };
  }

  const destinationKey = e164 || resolvedEmail || "";
  const recent = await prisma.otpChallenge.findFirst({
    where: {
      consumedAt: null,
      OR: [
        ...(e164 ? [{ phone: e164 }] : []),
        ...(resolvedEmail ? [{ email: resolvedEmail }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    const elapsed = Date.now() - recent.createdAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return {
        ok: false as const,
        error: "Wait before requesting another code",
        cooldownSec: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000),
      };
    }
  }

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  let providerRef: string | null = null;
  let deliveredVia: string[] = [];

  if (isSimulateMode()) {
    console.info(
      `[DataGrid OTP simulate] phone=${e164 || "—"} email=${resolvedEmail || "—"} → ${code}`
    );
    deliveredVia = [
      ...(sendSms ? ["sms"] : []),
      ...(sendEmail ? ["email"] : []),
    ];
  } else {
    // SMS: Sendchamp Verification API (reference for optional remote confirm).
    // Email: branded HTML via /email/send so inbox shows DataGrid logo + theme.
    let anyOk = false;

    if (sendSms && e164) {
      const smsSend = await sendchampSendOtp({
        channel: "sms",
        phone: e164,
        token: code,
        tokenLength: TOKEN_LENGTH,
        expirationMinutes: OTP_TTL_MINUTES,
        firstName,
      });
      if (smsSend.ok) {
        providerRef = smsSend.result.reference;
        deliveredVia.push("sms");
        anyOk = true;
      } else {
        console.error("[otp] Sendchamp SMS failed", smsSend.error);
      }
    }

    if (sendEmail && resolvedEmail) {
      const phoneHint = local
        ? `••••${local.slice(-4)}`
        : e164
          ? `••••${e164.slice(-4)}`
          : undefined;
      const emailSend = await sendchampSendEmail({
        to: [{ email: resolvedEmail, name: firstName }],
        subject: buildOtpEmailSubject(code),
        html: buildOtpEmailHtml({
          code,
          firstName,
          expiresInMinutes: OTP_TTL_MINUTES,
          phoneHint,
        }),
      });
      if (emailSend.ok) {
        deliveredVia.push("email");
        anyOk = true;
      } else {
        console.error("[otp] Sendchamp branded email failed", emailSend.error);
      }
    }

    if (!anyOk) {
      return {
        ok: false as const,
        error: "Could not send verification code. Try again shortly.",
      };
    }
  }

  const channelLabel =
    deliveredVia.length === 2
      ? "both"
      : deliveredVia[0] === "email"
        ? "email"
        : "sms";

  await prisma.otpChallenge.create({
    data: {
      phone: e164 || "",
      email: resolvedEmail,
      channel: channelLabel,
      providerRef,
      codeHash,
      expiresAt,
    },
  });

  return {
    ok: true as const,
    phone: e164 || destinationKey,
    phoneLocal: local || null,
    email: resolvedEmail,
    channels: deliveredVia,
    devHint: isSimulateMode() ? code : undefined,
  };
}

/**
 * Verify OTP — uses Sendchamp confirm when a provider reference exists,
 * otherwise falls back to local bcrypt match (simulate / legacy).
 */
export async function verifyOtp(
  rawPhoneOrEmail: string,
  code: string,
  opts?: { email?: string }
) {
  const e164 = toE164(rawPhoneOrEmail);
  const local = toLocalPhone(rawPhoneOrEmail);
  const email =
    normalizeEmail(opts?.email) ||
    (!e164 ? normalizeEmail(rawPhoneOrEmail) : null);

  if (!e164 && !email) {
    return { ok: false as const, error: "Invalid phone number or email" };
  }

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      consumedAt: null,
      expiresAt: { gt: new Date() },
      OR: [
        ...(e164 ? [{ phone: e164 }] : []),
        ...(email ? [{ email }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return { ok: false as const, error: "Code expired. Request a new one." };
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return {
      ok: false as const,
      error: "Too many attempts. Request a new code.",
    };
  }

  const trimmed = code.trim();
  let match = false;

  if (challenge.providerRef && isSendchampLive()) {
    const confirmed = await sendchampConfirmOtp({
      reference: challenge.providerRef,
      code: trimmed,
    });
    if (confirmed.ok) {
      match = true;
    } else {
      // Fall back to local hash (we always store our token when creating).
      match = await bcrypt.compare(trimmed, challenge.codeHash);
      if (!match) {
        await prisma.otpChallenge.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } },
        });
        return {
          ok: false as const,
          error:
            confirmed.error === "Incorrect code"
              ? "Incorrect code"
              : confirmed.error || "Incorrect code",
        };
      }
    }
  } else {
    match = await bcrypt.compare(trimmed, challenge.codeHash);
    if (!match) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      return { ok: false as const, error: "Incorrect code" };
    }
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  const phone = challenge.phone || e164;
  const phoneLocal = phone ? toLocalPhone(phone) : local;

  return {
    ok: true as const,
    phone: phone || "",
    phoneLocal: phoneLocal || "",
    email: challenge.email || email || null,
  };
}
