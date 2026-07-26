import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { formatNaira } from "@/lib/money";
import {
  brandedEmailShell,
  detailRows,
  escapeHtml,
  EMAIL_BRAND,
} from "@/lib/email/templates/layout";

export type PurchaseEmailInput = {
  firstName?: string;
  amount: number;
  orderRef: string;
  service: string;
  phone?: string | null;
  planName?: string | null;
  networkCode?: string | null;
  token?: string | null;
  customerName?: string | null;
};

function serviceLabel(service: string): string {
  const map: Record<string, string> = {
    DATA: "Data",
    AIRTIME: "Airtime",
    ELECTRICITY: "Electricity",
    CABLE: "Cable TV",
    EXAM_PIN: "Exam pin",
    BETTING: "Betting",
  };
  return map[service] || service.replace(/_/g, " ");
}

export function buildPurchaseEmailSubject(input: PurchaseEmailInput): string {
  return `${serviceLabel(input.service)} delivered · ${formatNaira(input.amount, { compact: true })} · ${SITE_NAME}`;
}

export function buildPurchaseEmailHtml(input: PurchaseEmailInput): string {
  const name = (input.firstName || "there").trim() || "there";
  const B = EMAIL_BRAND;
  const receiptUrl = absoluteUrl(`/history/${encodeURIComponent(input.orderRef)}`);
  const label = serviceLabel(input.service);

  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:${B.ink};">
      Hi ${escapeHtml(name)},
    </p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${B.muted};">
      Your <strong style="color:${B.ink};">${escapeHtml(label)}</strong> purchase was delivered successfully.
    </p>
    ${detailRows(
      [
        {
          label: "Amount",
          value: formatNaira(input.amount),
          emphasize: true,
        },
        { label: "Service", value: label },
        ...(input.planName
          ? [{ label: "Plan / package", value: input.planName }]
          : []),
        ...(input.networkCode
          ? [{ label: "Network", value: input.networkCode }]
          : []),
        ...(input.phone ? [{ label: "Recipient", value: input.phone }] : []),
        ...(input.customerName
          ? [{ label: "Customer", value: input.customerName }]
          : []),
        { label: "Order ref", value: input.orderRef },
        ...(input.token
          ? [{ label: "Token / PIN", value: input.token, emphasize: true }]
          : []),
      ].filter(Boolean) as { label: string; value: string; emphasize?: boolean }[]
    )}
    <p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:${B.muted};">
      Open your receipt anytime from History. Keep the order reference if you need support.
    </p>
  `;

  return brandedEmailShell({
    preheader: `${label} delivered · ${formatNaira(input.amount, { compact: true })}`,
    kicker: "Purchase",
    title: `${label} delivered`,
    bodyHtml,
    ctaLabel: "View receipt",
    ctaHref: receiptUrl,
  });
}

export function buildPurchaseEmailText(input: PurchaseEmailInput): string {
  const name = input.firstName || "there";
  const label = serviceLabel(input.service);
  return [
    `Hi ${name},`,
    "",
    `Your ${label} purchase was delivered.`,
    `Amount: ${formatNaira(input.amount)}`,
    input.planName ? `Plan: ${input.planName}` : "",
    input.phone ? `Recipient: ${input.phone}` : "",
    input.token ? `Token/PIN: ${input.token}` : "",
    `Order: ${input.orderRef}`,
    "",
    absoluteUrl(`/history/${input.orderRef}`),
  ]
    .filter(Boolean)
    .join("\n");
}
