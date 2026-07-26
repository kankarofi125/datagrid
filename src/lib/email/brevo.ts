import "server-only";

import nodemailer from "nodemailer";
import {
  buildOtpEmailHtml,
  buildOtpEmailSubject,
  buildOtpEmailText,
  type OtpEmailContent,
} from "@/lib/email/templates/otp";

/**
 * Brevo transactional email — sole email provider for DataGrid.
 *
 * Used for: login/2FA OTP, wallet funded, purchase receipts, and any
 * future product email. Phone OTP (SMS/WhatsApp) stays on Sendchamp.
 *
 * IMPORTANT: If Brevo → Security → Authorised IPs is enabled, the HTTP API
 * rejects every call from Vercel/unknown IPs. Either:
 *  - Disable authorised-IP restriction, or
 *  - Prefer SMTP (BREVO_TRANSPORT=smtp) which is not IP-locked the same way.
 *
 * API: POST https://api.brevo.com/v3/smtp/email
 */

const BREVO_API = "https://api.brevo.com/v3/smtp/email";

function apiKey(): string | null {
  return (
    process.env.BREVO_API_KEY?.trim() ||
    process.env.BREVO_API_KEY_V3?.trim() ||
    null
  );
}

function smtpConfig() {
  const host =
    process.env.BREVO_SMTP_HOST?.trim() || "smtp-relay.brevo.com";
  const port = Number(process.env.BREVO_SMTP_PORT || "587");
  const user =
    process.env.BREVO_SMTP_USER?.trim() ||
    process.env.BREVO_SMTP_LOGIN?.trim();
  const pass =
    process.env.BREVO_SMTP_PASSWORD?.trim() ||
    process.env.BREVO_SMTP_KEY?.trim();
  return { host, port, user, pass };
}

export function isBrevoConfigured(): boolean {
  const { user, pass } = smtpConfig();
  return Boolean(apiKey() || (user && pass));
}

/** smtp | api | auto (default: try API then SMTP) */
function transportMode(): "smtp" | "api" | "auto" {
  const raw = (process.env.BREVO_TRANSPORT || "auto").trim().toLowerCase();
  if (raw === "smtp" || raw === "api") return raw;
  return "auto";
}

function fromAddress(): { email: string; name: string } {
  const email =
    process.env.BREVO_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "auth@datagrid-ng.com";
  const name =
    process.env.BREVO_FROM_NAME?.trim() ||
    process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
    "DataGrid";
  return { email, name };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const { host, port, user, pass } = smtpConfig();
  if (!user || !pass) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

function humanizeBrevoError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("unrecognised ip") ||
    lower.includes("unrecognized ip") ||
    lower.includes("authorised_ips") ||
    lower.includes("authorized_ips")
  ) {
    return (
      "Brevo blocked this server IP. Open https://app.brevo.com/security/authorised_ips " +
      "and either add this IP or turn off IP restriction (required for Vercel)."
    );
  }
  if (lower.includes("sender") && (lower.includes("valid") || lower.includes("not"))) {
    return (
      "Brevo rejected the from-address. Verify auth@datagrid-ng.com under " +
      "Senders, domains & dedicated IPs."
    );
  }
  if (lower.includes("authentication failed") || lower.includes("invalid login")) {
    return "Brevo SMTP login failed. Regenerate the SMTP key in Brevo and update BREVO_SMTP_PASSWORD.";
  }
  return message;
}

async function sendViaApi(input: {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const key = apiKey();
  if (!key) return { ok: false, error: "BREVO_API_KEY is not configured" };

  const from = fromAddress();
  const payload = {
    sender: { name: from.name, email: from.email },
    to: [
      {
        email: input.to.email,
        name: input.to.name || input.to.email.split("@")[0],
      },
    ],
    subject: input.subject,
    htmlContent: input.html,
    ...(input.text ? { textContent: input.text } : {}),
  };

  try {
    const response = await fetch(BREVO_API, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": key,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const body = (await response.json().catch(() => ({}))) as {
      messageId?: string;
      message?: string;
      code?: string;
    };

    if (!response.ok) {
      const raw =
        body.message || body.code || `Brevo API failed (${response.status})`;
      return { ok: false, error: humanizeBrevoError(String(raw)) };
    }

    console.info("[email/brevo] API accepted", {
      messageId: body.messageId,
      to: input.to.email,
      from: from.email,
    });
    return { ok: true, messageId: body.messageId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Brevo API network error";
    return { ok: false, error: humanizeBrevoError(message) };
  }
}

async function sendViaSmtp(input: {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const transport = getTransporter();
  if (!transport) {
    return { ok: false, error: "Brevo SMTP is not configured" };
  }

  const from = fromAddress();
  const to = input.to.name
    ? `"${input.to.name}" <${input.to.email}>`
    : input.to.email;

  try {
    const info = await transport.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Brevo SMTP send failed";
    return { ok: false, error: humanizeBrevoError(message) };
  }
}

export async function sendBrevoEmail(input: {
  to: string | { email: string; name?: string };
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const to =
    typeof input.to === "string"
      ? { email: input.to }
      : { email: input.to.email, name: input.to.name };

  const mode = transportMode();
  const payload = {
    to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  };

  if (mode === "smtp") {
    return sendViaSmtp(payload);
  }

  if (mode === "api") {
    return sendViaApi(payload);
  }

  // auto: API first, then SMTP
  if (apiKey()) {
    const viaApi = await sendViaApi(payload);
    if (viaApi.ok) return viaApi;
    console.error("[email/brevo] API send failed", viaApi.error);
    if (getTransporter()) {
      const viaSmtp = await sendViaSmtp(payload);
      if (viaSmtp.ok) return viaSmtp;
      console.error("[email/brevo] SMTP fallback failed", viaSmtp.error);
      // Prefer the more actionable error (often IP restriction on API)
      return {
        ok: false,
        error: viaApi.error.includes("authorised_ips") || viaApi.error.includes("IP")
          ? viaApi.error
          : viaSmtp.error,
      };
    }
    return viaApi;
  }

  return sendViaSmtp(payload);
}

/** Branded DataGrid OTP email via Brevo. */
export async function sendBrevoOtpEmail(input: {
  to: string;
  name?: string;
  code: string;
  expiresInMinutes?: number;
  phoneHint?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const content: OtpEmailContent = {
    code: input.code,
    firstName: input.name,
    expiresInMinutes: input.expiresInMinutes,
    phoneHint: input.phoneHint,
  };

  return sendBrevoEmail({
    to: { email: input.to, name: input.name },
    subject: buildOtpEmailSubject(input.code),
    html: buildOtpEmailHtml(content),
    text: buildOtpEmailText(content),
  });
}
