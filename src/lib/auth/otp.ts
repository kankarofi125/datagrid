import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { toE164, toLocalPhone } from "@/lib/phone";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 45_000;

export function generateOtpCode(): string {
  if (process.env.OTP_MODE === "simulate" || !process.env.TERMII_API_KEY) {
    return process.env.OTP_DEV_CODE || "1234";
  }
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function requestOtp(rawPhone: string) {
  const e164 = toE164(rawPhone);
  const local = toLocalPhone(rawPhone);
  if (!e164 || !local) {
    return { ok: false as const, error: "Enter a valid Nigerian phone number" };
  }

  const recent = await prisma.otpChallenge.findFirst({
    where: { phone: e164, consumedAt: null },
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
  await prisma.otpChallenge.create({
    data: {
      phone: e164,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  // Termii/AT/Twilio would send here — simulate logs to console
  if (process.env.OTP_MODE === "simulate" || !process.env.TERMII_API_KEY) {
    console.info(`[DataGrid OTP] ${e164} → ${code}`);
  }

  return {
    ok: true as const,
    phone: e164,
    phoneLocal: local,
    devHint: process.env.OTP_MODE === "simulate" ? code : undefined,
  };
}

export async function verifyOtp(rawPhone: string, code: string) {
  const e164 = toE164(rawPhone);
  const local = toLocalPhone(rawPhone);
  if (!e164 || !local) {
    return { ok: false as const, error: "Invalid phone number" };
  }

  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone: e164, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) {
    return { ok: false as const, error: "Code expired. Request a new one." };
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return { ok: false as const, error: "Too many attempts. Request a new code." };
  }

  const match = await bcrypt.compare(code.trim(), challenge.codeHash);
  if (!match) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, error: "Incorrect code" };
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true as const, phone: e164, phoneLocal: local };
}
