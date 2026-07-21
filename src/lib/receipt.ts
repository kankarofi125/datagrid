import { formatNaira } from "@/lib/money";

export type ReceiptData = {
  orderRef: string;
  service: string;
  status: string;
  amount: number;
  phone?: string | null;
  networkCode?: string | null;
  meterNumber?: string | null;
  smartCardNumber?: string | null;
  customerName?: string | null;
  token?: string | null;
  packageCode?: string | null;
  deliveredAt?: string | Date | null;
  createdAt?: string | Date | null;
  meta?: { planName?: string } | null;
};

export function receiptPlainText(r: ReceiptData) {
  const lines = [
    "DATAGRID RECEIPT",
    "================",
    `Order: ${r.orderRef}`,
    `Status: ${r.status}`,
    `Service: ${r.service}`,
    `Amount: ${formatNaira(r.amount)}`,
  ];
  if (r.phone) lines.push(`Phone: ${r.phone}`);
  if (r.networkCode) lines.push(`Network: ${r.networkCode}`);
  if (r.customerName) lines.push(`Customer: ${r.customerName}`);
  if (r.meterNumber) lines.push(`Meter: ${r.meterNumber}`);
  if (r.smartCardNumber) lines.push(`IUC: ${r.smartCardNumber}`);
  if (r.meta?.planName) lines.push(`Plan: ${r.meta.planName}`);
  if (r.token) lines.push(`Token/Pin: ${r.token}`);
  if (r.deliveredAt) lines.push(`Delivered: ${new Date(r.deliveredAt).toISOString()}`);
  lines.push("----------------", "datagrid.ng · transactions final after delivery");
  return lines.join("\n");
}

/** Minimal print-ready HTML (open in new window → Save as PDF) */
export function receiptHtml(r: ReceiptData) {
  const plan = r.meta?.planName || "";
  return `<!DOCTYPE html>
<html lang="en-NG">
<head>
<meta charset="utf-8"/>
<title>Receipt ${r.orderRef}</title>
<style>
  body{font-family:ui-monospace,monospace;max-width:420px;margin:24px auto;color:#0B231A;background:#F3F4EC}
  h1{font-family:Impact,sans-serif;letter-spacing:.02em;font-size:28px;margin:0}
  .stamp{display:inline-block;border:3px solid #008751;color:#008751;padding:4px 10px;transform:rotate(-8deg);font-weight:bold}
  .row{display:flex;justify-content:space-between;border-bottom:1px solid rgba(11,35,26,.14);padding:8px 0;font-size:13px}
  .token{font-size:22px;letter-spacing:.08em;word-break:break-all;background:#04291C;color:#F3F4EC;padding:16px;margin:16px 0}
  .muted{color:rgba(11,35,26,.55);font-size:11px}
  @media print{body{margin:0}}
</style>
</head>
<body>
  <p class="muted">DATAGRID · NATIONAL GRID FOR YOUR PHONE</p>
  <h1>RECEIPT</h1>
  ${r.status === "DELIVERED" ? '<p class="stamp">DELIVERED</p>' : ""}
  <div class="row"><span>Order</span><strong>${escapeHtml(r.orderRef)}</strong></div>
  <div class="row"><span>Service</span><span>${escapeHtml(r.service)}</span></div>
  ${plan ? `<div class="row"><span>Plan</span><span>${escapeHtml(plan)}</span></div>` : ""}
  ${r.phone ? `<div class="row"><span>Phone</span><span>${escapeHtml(r.phone)}</span></div>` : ""}
  ${r.networkCode ? `<div class="row"><span>Network</span><span>${escapeHtml(r.networkCode)}</span></div>` : ""}
  ${r.customerName ? `<div class="row"><span>Customer</span><span>${escapeHtml(r.customerName)}</span></div>` : ""}
  ${r.meterNumber ? `<div class="row"><span>Meter</span><span>${escapeHtml(r.meterNumber)}</span></div>` : ""}
  ${r.smartCardNumber ? `<div class="row"><span>IUC</span><span>${escapeHtml(r.smartCardNumber)}</span></div>` : ""}
  <div class="row"><span>Amount</span><strong>${escapeHtml(formatNaira(r.amount))}</strong></div>
  ${r.token ? `<div class="token">${escapeHtml(r.token)}</div>` : ""}
  <p class="muted">Transactions final after delivery. Support: WhatsApp with order ref.</p>
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
