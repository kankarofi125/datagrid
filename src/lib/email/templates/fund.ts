import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { formatNaira } from "@/lib/money";
import {
  brandedEmailShell,
  detailRows,
  escapeHtml,
  EMAIL_BRAND,
} from "@/lib/email/templates/layout";

export type FundEmailInput = {
  firstName?: string;
  amount: number;
  orderRef: string;
  balance?: number;
  method?: string;
};

export function buildFundEmailSubject(amount: number): string {
  return `Wallet funded · ${formatNaira(amount, { compact: true })} · ${SITE_NAME}`;
}

export function buildFundEmailHtml(input: FundEmailInput): string {
  const name = (input.firstName || "there").trim() || "there";
  const B = EMAIL_BRAND;
  const walletUrl = absoluteUrl("/wallet");

  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:${B.ink};">
      Hi ${escapeHtml(name)},
    </p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${B.muted};">
      Your ${SITE_NAME} wallet was funded successfully. Funds are available for data, airtime, bills, and more.
    </p>
    ${detailRows([
      {
        label: "Amount credited",
        value: formatNaira(input.amount),
        emphasize: true,
      },
      ...(input.balance != null
        ? [{ label: "New balance", value: formatNaira(input.balance) }]
        : []),
      ...(input.method
        ? [{ label: "Method", value: input.method }]
        : []),
      { label: "Reference", value: input.orderRef },
    ])}
    <p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:${B.muted};">
      Keep this reference for your records. If you did not initiate this funding, contact support immediately.
    </p>
  `;

  return brandedEmailShell({
    preheader: `${formatNaira(input.amount, { compact: true })} added to your wallet`,
    kicker: "Wallet",
    title: "Funds received",
    bodyHtml,
    ctaLabel: "Open wallet",
    ctaHref: walletUrl,
  });
}

export function buildFundEmailText(input: FundEmailInput): string {
  const name = input.firstName || "there";
  return [
    `Hi ${name},`,
    "",
    `Your ${SITE_NAME} wallet was funded with ${formatNaira(input.amount)}.`,
    input.balance != null ? `New balance: ${formatNaira(input.balance)}.` : "",
    input.method ? `Method: ${input.method}.` : "",
    `Reference: ${input.orderRef}`,
    "",
    absoluteUrl("/wallet"),
  ]
    .filter(Boolean)
    .join("\n");
}
