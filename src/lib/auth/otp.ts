import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { toE164, toLocalPhone } from "@/lib/phone";
import { isBrevoConfigured, sendBrevoOtpEmail } from "@/lib/email/brevo";
import {
  isSendchampLive,
  normalizeOtpChannel,
  sendchampConfirmOtp,
  sendchampSendOtp,
  type SendchampOtpChannel,
} from "@/lib/sendchamp";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 45_000;
const TOKEN_LENGTH = 4;

/**
 * Delivery config via OTP_CHANNELS (comma-separated):
 *   whatsapp (default) — phone OTP over WhatsApp
 *   sms — classic SMS
 *   email — branded email
 *   whatsapp,email | sms,email | both (= whatsapp+email)
 */
export type PhoneOtpTransport = "whatsapp" | "sms";

function parseChannels(raw?: string): {
  phone: PhoneOtpTransport | null;
  email: boolean;
} {
  const value = (raw || process.env.OTP_CHANNELS || "whatsapp")
    .trim()
    .toLowerCase();

  if (value === "both") {
    return { phone: "whatsapp", email: true };
  }
  if (value === "email") {
    return { phone: null, email: true };
  }
  if (value === "sms") {
    return { phone: "sms", email: false };
  }
  if (value === "whatsapp" || value === "wa") {
    return { phone: "whatsapp", email: false };
  }

  const parts = value.split(/[,\s|]+/).filter(Boolean);
  let phone: PhoneOtpTransport | null = null;
  let email = false;
  for (const p of parts) {
    if (p === "email") email = true;
    else if (p === "sms") phone = "sms";
    else if (p === "whatsapp" || p === "wa") phone = "whatsapp";
  }
  if (!phone && !email) phone = "whatsapp";
  return { phone, email };
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
  /** Override env OTP_CHANNELS for this request (e.g. "whatsapp", "sms,email") */
  channels?: string;
  firstName?: string;
  /** Skip resend cooldown (login 2FA / Google step) */
  skipCooldown?: boolean;
};

/**
 * Request an OTP via Sendchamp (WhatsApp/SMS and/or branded email) or simulate.
 */
export async function requestOtp(rawPhoneOrInput: string | RequestOtpInput) {
  const input: RequestOtpInput =
    typeof rawPhoneOrInput === "string"
      ? { phone: rawPhoneOrInput }
      : rawPhoneOrInput;

  const e164 = input.phone ? toE164(input.phone) : null;
  const local = input.phone ? toLocalPhone(input.phone) : null;
  const email = normalizeEmail(input.email);

  const { phone: phoneTransport, email: wantEmail } = parseChannels(
    input.channels
  );
  const wantPhone = Boolean(phoneTransport);

  if (wantPhone && (!e164 || !local)) {
    return { ok: false as const, error: "Enter a valid Nigerian phone number" };
  }
  if (wantEmail && !email) {
    if (wantPhone && e164) {
      // resolve later from user record
    } else if (!wantPhone) {
      return { ok: false as const, error: "Enter a valid email address" };
    }
  }

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

  const sendPhone = wantPhone && Boolean(e164);
  const sendEmail = wantEmail && Boolean(resolvedEmail);

  if (!sendPhone && !sendEmail) {
    return {
      ok: false as const,
      error:
        wantEmail && !wantPhone
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
  if (recent && !input.skipCooldown) {
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
      `[DataGrid OTP simulate] phone=${e164 || "—"} email=${resolvedEmail || "—"} via=${phoneTransport || "—"} → ${code}`
    );
    deliveredVia = [
      ...(sendPhone ? [phoneTransport!] : []),
      ...(sendEmail ? ["email"] : []),
    ];
  } else {
    let anyOk = false;

    // Phone OTP: WhatsApp preferred (SMS often blocked / not provisioned).
    if (sendPhone && e164 && phoneTransport) {
      const channel: SendchampOtpChannel =
        normalizeOtpChannel(phoneTransport) || "whatsapp";

      const phoneSend = await sendchampSendOtp({
        channel,
        phone: e164,
        token: code,
        tokenLength: TOKEN_LENGTH,
        expirationMinutes: OTP_TTL_MINUTES,
        firstName,
      });

      if (phoneSend.ok) {
        providerRef = phoneSend.result.reference;
        deliveredVia.push(channel);
        anyOk = true;
      } else {
        console.error(
          `[otp] Sendchamp ${channel} failed`,
          phoneSend.error
        );

        // If WhatsApp fails and we didn't explicitly require only WA, try SMS once.
        if (
          channel === "whatsapp" &&
          (process.env.OTP_WHATSAPP_FALLBACK_SMS || "1") !== "0"
        ) {
          const smsFallback = await sendchampSendOtp({
            channel: "sms",
            phone: e164,
            token: code,
            tokenLength: TOKEN_LENGTH,
            expirationMinutes: OTP_TTL_MINUTES,
            firstName,
          });
          if (smsFallback.ok) {
            providerRef = smsFallback.result.reference;
            deliveredVia.push("sms");
            anyOk = true;
            console.warn("[otp] WhatsApp failed; delivered via SMS fallback");
          } else {
            console.error("[otp] SMS fallback also failed", smsFallback.error);
          }
        }
      }
    }

    if (sendEmail && resolvedEmail) {
      const phoneHint = local
        ? `••••${local.slice(-4)}`
        : e164
          ? `••••${e164.slice(-4)}`
          : undefined;

      // Branded HTML via Brevo (API or SMTP).
      if (isBrevoConfigured()) {
        const emailSend = await sendBrevoOtpEmail({
          to: resolvedEmail,
          name: firstName,
          code,
          expiresInMinutes: OTP_TTL_MINUTES,
          phoneHint,
        });
        if (emailSend.ok) {
          deliveredVia.push("email");
          anyOk = true;
        } else {
          console.error("[otp] Brevo branded email failed", emailSend.error);
          // Local/dev: still create challenge so 2FA can be tested without Brevo.
          if (
            process.env.NODE_ENV !== "production" ||
            process.env.OTP_EMAIL_DEV_FALLBACK === "1"
          ) {
            console.info(
              `[DataGrid OTP email fallback] ${resolvedEmail} → ${code}\n` +
                `  (Brevo error: ${emailSend.error})`
            );
            deliveredVia.push("email-dev");
            anyOk = true;
          } else if (!sendPhone) {
            return {
              ok: false as const,
              error: emailSend.error,
            };
          }
        }
      } else if (!sendPhone) {
        if (
          process.env.NODE_ENV !== "production" ||
          process.env.OTP_EMAIL_DEV_FALLBACK === "1"
        ) {
          console.info(
            `[DataGrid OTP email fallback] ${resolvedEmail} → ${code} (Brevo not configured)`
          );
          deliveredVia.push("email-dev");
          anyOk = true;
        } else {
          return {
            ok: false as const,
            error:
              "Email delivery is not configured. Set BREVO_API_KEY or Brevo SMTP credentials.",
          };
        }
      } else {
        console.error(
          "[otp] Email requested but Brevo is not configured (BREVO_API_KEY / SMTP)"
        );
      }
    }

    if (!anyOk) {
      return {
        ok: false as const,
        error:
          phoneTransport === "whatsapp"
            ? "Could not send WhatsApp code. Confirm Sendchamp WhatsApp is active, or try again."
            : "Could not send verification code. Try again shortly.",
      };
    }
  }

  const channelLabel = deliveredVia.join("+") || "whatsapp";
  const usedEmailDevFallback = deliveredVia.includes("email-dev");

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
    // Show code in UI when simulate OR when Brevo failed and we fell back locally.
    devHint:
      isSimulateMode() || usedEmailDevFallback ? code : undefined,
  };
}

/**
 * Verify OTP — uses Sendchamp confirm when a provider reference exists,
 * otherwise falls back to local bcrypt match (simulate / branded email).
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
