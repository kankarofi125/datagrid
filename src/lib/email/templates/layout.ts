import { absoluteUrl, SITE_NAME } from "@/lib/site";

/** DataGrid brand tokens (mirror globals.css) */
export const EMAIL_BRAND = {
  green: "#168653",
  greenDeep: "#0a2e22",
  greenDeep2: "#123b2a",
  amber: "#fba907",
  paper: "#f7f4ec",
  ink: "#0f1f18",
  muted: "#5c6b63",
  line: "#d9e0db",
  white: "#ffffff",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Shared branded HTML shell for all transactional emails.
 * Table layout + inline CSS for Gmail / Outlook.
 */
export function brandedEmailShell(opts: {
  preheader?: string;
  kicker: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
}): string {
  const logoUrl = absoluteUrl("/icons/icon-192.png");
  const homeUrl = absoluteUrl("/");
  const privacyUrl = absoluteUrl("/privacy");
  const supportUrl = absoluteUrl("/support");
  const year = new Date().getFullYear();
  const B = EMAIL_BRAND;
  const ctaHref = opts.ctaHref || homeUrl;
  const ctaLabel = opts.ctaLabel || `Open ${SITE_NAME}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(opts.title)} · ${SITE_NAME}</title>
</head>
<body style="margin:0;padding:0;background:${B.paper};color:${B.ink};font-family:Instrument Sans,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.paper};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${B.white};border:1px solid ${B.line};border-radius:20px;overflow:hidden;box-shadow:0 18px 48px -36px rgba(10,46,34,.45);">
          <tr>
            <td style="background:linear-gradient(145deg,${B.greenDeep2},${B.greenDeep});padding:28px 28px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="width:48px;">
                    <img src="${logoUrl}" width="44" height="44" alt="${SITE_NAME}" style="display:block;border-radius:12px;border:0;" />
                  </td>
                  <td valign="middle" style="padding-left:12px;">
                    <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${B.amber};font-weight:600;">${SITE_NAME}</div>
                    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-top:6px;font-weight:600;">${escapeHtml(opts.kicker)}</div>
                    <div style="font-size:20px;font-weight:700;color:${B.white};margin-top:4px;letter-spacing:-0.02em;">${escapeHtml(opts.title)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;" align="center">
              <a href="${ctaHref}" style="display:inline-block;background:${B.green};color:${B.white};text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:12px;">
                ${escapeHtml(ctaLabel)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid ${B.line};background:${B.paper};padding:18px 28px 22px;">
              <p style="margin:0 0 8px;font-size:12px;color:${B.muted};line-height:1.5;">
                Nigerian airtime, data &amp; bills — delivered with clear receipts.
              </p>
              <p style="margin:0;font-size:12px;color:${B.muted};">
                <a href="${homeUrl}" style="color:${B.green};text-decoration:none;">Home</a>
                &nbsp;·&nbsp;
                <a href="${privacyUrl}" style="color:${B.green};text-decoration:none;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="${supportUrl}" style="color:${B.green};text-decoration:none;">Support</a>
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

export function detailRows(
  rows: { label: string; value: string; emphasize?: boolean }[]
): string {
  const B = EMAIL_BRAND;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${B.line};border-radius:14px;overflow:hidden;margin:0 0 20px;">
      ${rows
        .map(
          (r, i) => `
        <tr>
          <td style="padding:12px 14px;border-top:${i === 0 ? "0" : `1px solid ${B.line}`};font-size:12px;color:${B.muted};width:40%;">${escapeHtml(r.label)}</td>
          <td style="padding:12px 14px;border-top:${i === 0 ? "0" : `1px solid ${B.line}`};font-size:${r.emphasize ? "16px" : "13px"};font-weight:${r.emphasize ? "700" : "600"};color:${r.emphasize ? B.green : B.ink};text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(r.value)}</td>
        </tr>`
        )
        .join("")}
    </table>`;
}
