import "server-only";

import nodemailer from "nodemailer";
import {
  buildOtpEmailHtml,
  buildOtpEmailSubject,
  buildOtpEmailText,
  type OtpEmailContent,
} from "@/lib/email/templates/otp";

/**
 * Brevo transactional email.
 * Prefer HTTP API (api-key) on Vercel; SMTP is a fallback.
 *
 * API: POST https://api.brevo.com/v3/smtp/email
 * Docs: https://developers.brevo.com/reference/sendtransacemail
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
      const error =
        body.message ||
        body.code ||
        `Brevo API failed (${response.status})`;
      return { ok: false, error };
    }

    return { ok: true, messageId: body.messageId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Brevo API network error";
    return { ok: false, error: message };
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
    return { ok: false, error: message };
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

  // Prefer HTTP API on serverless (Vercel); SMTP as fallback.
  if (apiKey()) {
    const viaApi = await sendViaApi({
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (viaApi.ok) return viaApi;
    console.error("[email/brevo] API send failed", viaApi.error);

    // Fall through to SMTP if configured
    if (!getTransporter()) return viaApi;
  }

  const viaSmtp = await sendViaSmtp({
    to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (!viaSmtp.ok) {
    console.error("[email/brevo] SMTP send failed", viaSmtp.error);
  }
  return viaSmtp;
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
