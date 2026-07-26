import "server-only";

/**
 * Sendchamp Communication API client.
 * Docs: https://sendchamp.readme.io/reference/introduction
 *
 * Base: https://api.sendchamp.com/api/v1
 * Auth: Authorization: Bearer {Access Key}
 *
 * OTP:
 *  POST /verification/create  — send OTP (sms | email | voice | whatsapp)
 *  POST /verification/confirm — verify code with returned reference
 *
 * Messaging:
 *  POST /sms/send
 *  POST /email/send
 */

const SENDCHAMP_BASE =
  process.env.SENDCHAMP_BASE_URL?.trim() ||
  "https://api.sendchamp.com/api/v1";

export type SendchampOtpChannel = "sms" | "email" | "voice" | "whatsapp";

type SendchampEnvelope<T> = {
  code?: number;
  status?: string;
  message?: string;
  errors?: unknown;
  data?: T;
};

function apiKey(): string | null {
  return process.env.SENDCHAMP_API_KEY?.trim() || null;
}

export function isSendchampConfigured(): boolean {
  return Boolean(apiKey());
}

export function isSendchampLive(): boolean {
  return (
    isSendchampConfigured() &&
    process.env.OTP_MODE !== "simulate" &&
    process.env.OTP_MODE !== "sim"
  );
}

/** Sendchamp expects international MSISDN without + (e.g. 2348012345678). */
export function toSendchampMsisdn(e164OrLocal: string): string {
  const digits = e164OrLocal.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length >= 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `234${digits.slice(1)}`;
  if (digits.length === 10) return `234${digits}`;
  return digits;
}

async function sendchampFetch<T>(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: true; data: T; raw: SendchampEnvelope<T> } | { ok: false; error: string; status?: number; raw?: unknown }> {
  const key = apiKey();
  if (!key) {
    return { ok: false, error: "SENDCHAMP_API_KEY is not configured" };
  }

  let response: Response;
  try {
    response = await fetch(`${SENDCHAMP_BASE}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sendchamp network error";
    return { ok: false, error: message };
  }

  const raw = (await response.json().catch(() => ({}))) as SendchampEnvelope<T> & {
    error?: string;
  };

  const success =
    response.ok &&
    (raw.status === "success" ||
      raw.code === 200 ||
      (typeof raw.code === "undefined" && response.status < 400));

  if (!success) {
    const error =
      (typeof raw.message === "string" && raw.message) ||
      (typeof raw.error === "string" && raw.error) ||
      (typeof raw.errors === "string" && raw.errors) ||
      `Sendchamp request failed (${response.status})`;
    return { ok: false, error, status: response.status, raw };
  }

  return { ok: true, data: (raw.data ?? ({} as T)) as T, raw };
}

/** Sendchamp OTP channel strings (API is case-sensitive; use lowercase). */
export function normalizeOtpChannel(
  channel: string
): SendchampOtpChannel | null {
  const c = channel.trim().toLowerCase();
  if (c === "sms" || c === "email" || c === "voice" || c === "whatsapp") {
    return c;
  }
  if (c === "wa" || c === "whats-app") return "whatsapp";
  return null;
}

export type SendOtpInput = {
  channel: SendchampOtpChannel;
  /** E.164 or local NG phone — required for sms/voice/whatsapp */
  phone?: string;
  /** Required for email channel */
  email?: string;
  /** Optional own token; otherwise Sendchamp generates one */
  token?: string;
  tokenLength?: number;
  expirationMinutes?: number;
  firstName?: string;
  /** SMS sender ID, WhatsApp business number, or email from-name */
  sender?: string;
};

export type SendOtpResult = {
  reference: string;
  /** Present when Sendchamp echoes the token (do not log in production). */
  token?: string;
  status?: string;
  channel?: string;
};

/**
 * POST /verification/create
 * @see https://sendchamp.readme.io/reference/send-otp-api
 */
export async function sendchampSendOtp(
  input: SendOtpInput
): Promise<
  | { ok: true; result: SendOtpResult }
  | { ok: false; error: string }
> {
  const channel = normalizeOtpChannel(input.channel);
  if (!channel) {
    return { ok: false, error: `Unsupported OTP channel: ${input.channel}` };
  }
  const tokenLength = input.tokenLength ?? 4;
  const expirationMinutes = input.expirationMinutes ?? 10;

  // Two different numbers in OTP:
  // - sender  = YOUR business identity on Sendchamp (not the customer)
  // - customer_mobile_number = the user logging in (passed as input.phone)
  //
  // Do NOT use NEXT_PUBLIC_WHATSAPP (support chat link) as the Sendchamp sender.
  // Leave SENDCHAMP_WHATSAPP_SENDER empty to use Sendchamp account default.
  const smsSender =
    input.sender ||
    process.env.SENDCHAMP_SMS_SENDER?.trim() ||
    "Sendchamp";
  const waSenderEnv = process.env.SENDCHAMP_WHATSAPP_SENDER?.trim();
  const whatsappSender = input.sender || waSenderEnv || "Sendchamp";
  const emailSender =
    input.sender ||
    process.env.SENDCHAMP_EMAIL_FROM?.trim() ||
    process.env.SENDCHAMP_EMAIL_FROM_NAME?.trim() ||
    "DataGrid";

  const sender =
    channel === "email"
      ? emailSender
      : channel === "whatsapp"
        ? // Only normalize if it looks like a phone; brand names stay as-is
          /^\+?\d{10,15}$/.test(whatsappSender.replace(/\s/g, ""))
            ? toSendchampMsisdn(whatsappSender)
            : whatsappSender
        : smsSender;

  const body: Record<string, unknown> = {
    // API rejects "WhatsApp"; must be lowercase "whatsapp" | "sms" | "email" | "voice"
    channel,
    sender,
    token_type: "numeric",
    token_length: tokenLength,
    expiration_time: expirationMinutes,
    meta_data: {
      first_name: input.firstName || "Customer",
      product: "DataGrid",
    },
  };

  if (input.token) body.token = input.token;

  if (channel === "email") {
    if (!input.email || !input.email.includes("@")) {
      return { ok: false, error: "A valid email is required for email OTP" };
    }
    body.customer_email_address = input.email.trim().toLowerCase();
  } else {
    if (!input.phone) {
      return {
        ok: false,
        error: "A phone number is required for WhatsApp/SMS OTP",
      };
    }
    body.customer_mobile_number = toSendchampMsisdn(input.phone);
  }

  const res = await sendchampFetch<{
    reference?: string;
    token?: string;
    status?: string;
    channel?: { name?: string } | string;
  }>("/verification/create", body);

  if (!res.ok) return { ok: false, error: res.error };

  const reference = res.data.reference;
  if (!reference) {
    return { ok: false, error: "Sendchamp did not return an OTP reference" };
  }

  const channelName =
    typeof res.data.channel === "string"
      ? res.data.channel
      : res.data.channel?.name;

  return {
    ok: true,
    result: {
      reference,
      token: typeof res.data.token === "string" ? res.data.token : undefined,
      status: res.data.status,
      channel: channelName,
    },
  };
}

/**
 * POST /verification/confirm
 * @see https://sendchamp.readme.io/reference/confirm-otp-api
 */
export async function sendchampConfirmOtp(input: {
  reference: string;
  code: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await sendchampFetch<Record<string, unknown>>(
    "/verification/confirm",
    {
      verification_reference: input.reference,
      verification_code: input.code.trim(),
    }
  );

  if (!res.ok) {
    return {
      ok: false,
      error:
        res.error.toLowerCase().includes("invalid")
          ? "Incorrect code"
          : res.error,
    };
  }
  return { ok: true };
}

/**
 * POST /sms/send — plain SMS (non-OTP transactional use).
 * @see https://sendchamp.readme.io/reference/send-sms-api
 */
export async function sendchampSendSms(input: {
  to: string | string[];
  message: string;
  senderName?: string;
  route?: "dnd" | "non_dnd" | "international";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const toList = (Array.isArray(input.to) ? input.to : [input.to]).map(
    toSendchampMsisdn
  );
  const res = await sendchampFetch("/sms/send", {
    to: toList,
    message: input.message,
    sender_name:
      input.senderName ||
      process.env.SENDCHAMP_SMS_SENDER?.trim() ||
      "Sendchamp",
    route: input.route || process.env.SENDCHAMP_SMS_ROUTE?.trim() || "dnd",
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}

/**
 * POST /email/send — plain email.
 * @see https://sendchamp.readme.io/reference/send-email-api
 */
export async function sendchampSendEmail(input: {
  to: { email: string; name?: string }[];
  subject: string;
  html: string;
  from?: { email?: string; name?: string };
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const fromEmail =
    input.from?.email ||
    process.env.SENDCHAMP_EMAIL_FROM?.trim() ||
    undefined;
  const fromName =
    input.from?.name ||
    process.env.SENDCHAMP_EMAIL_FROM_NAME?.trim() ||
    process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
    "DataGrid";

  const body: Record<string, unknown> = {
    subject: input.subject,
    to: input.to.map((r) => ({
      email: r.email,
      name: r.name || r.email.split("@")[0],
    })),
    message_body: {
      type: "text/html",
      value: input.html,
    },
  };
  if (fromEmail) {
    body.from = { email: fromEmail, name: fromName };
  }

  const res = await sendchampFetch("/email/send", body);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}
