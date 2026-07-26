import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { emailAssetUrl, EMAIL_BRAND as BRAND } from "@/lib/email/templates/layout";

export type OtpEmailContent = {
  code: string;
  firstName?: string;
  /** Minutes until expiry */
  expiresInMinutes?: number;
  /** Phone last-4 for context, e.g. ••••9851 */
  phoneHint?: string;
};

/**
 * Branded HTML OTP email for Sendchamp /email/send.
 * Table layout + inline CSS for Gmail / Outlook compatibility.
 */
export function buildOtpEmailHtml(input: OtpEmailContent): string {
  const name = (input.firstName || "there").trim() || "there";
  const minutes = input.expiresInMinutes ?? 10;
  const logoUrl = emailAssetUrl("/icons/icon-192.png");
  const homeUrl = absoluteUrl("/");
  const privacyUrl = absoluteUrl("/privacy");
  const supportUrl = absoluteUrl("/support");
  const year = new Date().getFullYear();
  const digits = input.code.replace(/\D/g, "").slice(0, 8);
  const codeBoxes = digits
    .split("")
    .map(
      (d) =>
        `<td style="width:44px;height:52px;border:1px solid ${BRAND.line};border-radius:10px;background:${BRAND.white};text-align:center;vertical-align:middle;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:22px;font-weight:700;color:${BRAND.ink};letter-spacing:0;">${d}</td>`
    )
    .join('<td style="width:8px;"></td>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${SITE_NAME} verification code</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper};color:${BRAND.ink};font-family:Instrument Sans,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.white};border:1px solid ${BRAND.line};border-radius:20px;overflow:hidden;box-shadow:0 18px 48px -36px rgba(10,46,34,.45);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(145deg,${BRAND.greenDeep2},${BRAND.greenDeep});padding:28px 28px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="width:48px;">
                    <img src="${logoUrl}" width="44" height="44" alt="${SITE_NAME}" style="display:block;border-radius:12px;border:0;" />
                  </td>
                  <td valign="middle" style="padding-left:12px;">
                    <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${BRAND.amber};font-weight:600;">${SITE_NAME}</div>
                    <div style="font-size:20px;font-weight:700;color:${BRAND.white};margin-top:4px;letter-spacing:-0.02em;">Verify your line</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:${BRAND.ink};">
                Hi ${escapeHtml(name)},
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.muted};">
                Use this one-time code to continue on ${SITE_NAME}
                ${input.phoneHint ? ` for <strong style="color:${BRAND.ink};">${escapeHtml(input.phoneHint)}</strong>` : ""}.
                It expires in <strong style="color:${BRAND.ink};">${minutes} minutes</strong>.
              </p>

              <p style="margin:0 0 10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${BRAND.muted};font-weight:600;">
                Your verification code
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>${codeBoxes}</tr>
              </table>
              <p style="margin:0 0 24px;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;color:${BRAND.muted};">
                or enter: <strong style="color:${BRAND.green};letter-spacing:.2em;">${escapeHtml(digits)}</strong>
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};border:1px solid ${BRAND.line};border-radius:14px;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;line-height:1.55;color:${BRAND.muted};">
                    <strong style="color:${BRAND.greenDeep};">Security tip:</strong>
                    ${SITE_NAME} will never ask for this code, your PIN, or your password by phone or chat.
                    If you did not request this, you can ignore this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:20px 28px 28px;" align="center">
              <a href="${homeUrl}" style="display:inline-block;background:${BRAND.green};color:${BRAND.white};text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:12px;">
                Open ${SITE_NAME}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid ${BRAND.line};background:${BRAND.paper};padding:18px 28px 22px;">
              <p style="margin:0 0 8px;font-size:12px;color:${BRAND.muted};line-height:1.5;">
                Nigerian airtime, data &amp; bills — delivered with clear receipts.
              </p>
              <p style="margin:0;font-size:12px;color:${BRAND.muted};">
                <a href="${homeUrl}" style="color:${BRAND.green};text-decoration:none;">Home</a>
                &nbsp;·&nbsp;
                <a href="${privacyUrl}" style="color:${BRAND.green};text-decoration:none;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="${supportUrl}" style="color:${BRAND.green};text-decoration:none;">Support</a>
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#8a968f;">
                © ${year} ${SITE_NAME} · Nigeria
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildOtpEmailSubject(code?: string): string {
  // Avoid putting the full code in subject (better for privacy / anti-phishing).
  void code;
  return `${SITE_NAME} verification code`;
}

export function buildOtpEmailText(input: OtpEmailContent): string {
  const name = input.firstName || "there";
  const minutes = input.expiresInMinutes ?? 10;
  return [
    `Hi ${name},`,
    "",
    `Your ${SITE_NAME} verification code is ${input.code}.`,
    `It expires in ${minutes} minutes.`,
    "",
    "If you did not request this, ignore this email.",
    "",
    absoluteUrl("/"),
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
