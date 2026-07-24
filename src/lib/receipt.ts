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

/** Print-ready receipt (open in a new window → Save as PDF). */
export function receiptHtml(r: ReceiptData) {
  const plan = r.meta?.planName || "";
  const successful = r.status === "DELIVERED";
  const amount = escapeHtml(formatNaira(r.amount));
  const amountSize =
    amount.length > 23 ? "amount amount-xs" : amount.length > 18 ? "amount amount-sm" : "amount";
  return `<!DOCTYPE html>
<html lang="en-NG">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Receipt ${r.orderRef}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#ebe8de;color:#0b231a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .page{width:min(100% - 28px,440px);margin:28px auto}
  .receipt{border:1px solid rgba(11,35,26,.1);border-radius:24px;background:#f8f6ef;padding:14px;box-shadow:0 22px 70px rgba(7,31,23,.14)}
  .hero{border-radius:18px;background:${successful ? "linear-gradient(145deg,#123b2a,#082d21)" : "linear-gradient(145deg,#85383c,#642529)"};padding:19px;color:#f5f3ec}
  .top{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .status{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700}
  .check{display:grid;width:36px;height:36px;place-items:center;border-radius:50%;background:rgba(255,255,255,.1);font-size:18px}
  .eyebrow,.label{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.14em}
  .eyebrow{margin-top:3px;color:rgba(245,243,236,.48);font-size:8px}
  .pill{border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:5px 8px;color:rgba(245,243,236,.65);font-size:8px}
  .amount{margin:24px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:36px;font-weight:750;letter-spacing:-.045em;line-height:1}
  .amount-sm{font-size:25px}.amount-xs{font-size:20px}
  .summary{margin:8px 0 0;color:rgba(245,243,236,.56);font-size:12px}
  .reference{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;border:1px dashed rgba(11,35,26,.2);border-radius:14px;background:#fff;padding:12px 14px}
  .label{color:rgba(11,35,26,.42);font-size:8px}
  .value{margin-top:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:700;word-break:break-all}
  .details{margin-top:12px;overflow:hidden;border:1px solid rgba(11,35,26,.1);border-radius:14px;background:#fff}
  .row{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid rgba(11,35,26,.09);padding:10px 13px;font-size:12px}
  .row:last-child{border-bottom:0}.row span:first-child{color:rgba(11,35,26,.48)}.row strong{text-align:right}
  .token{margin-top:12px;border-radius:16px;background:#082d21;padding:16px;color:#f5f3ec}
  .token .label{color:#f2a63d}.token strong{display:block;margin-top:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:22px;letter-spacing:.08em;word-break:break-all}
  .foot{margin:15px 4px 4px;text-align:center;color:rgba(11,35,26,.5);font-size:10px;line-height:1.5}
  @media(max-width:460px){.page{margin:14px auto}.amount{font-size:31px}.receipt{padding:10px}}
  @media print{body{background:#fff}.page{width:100%;margin:0}.receipt{border:0;box-shadow:none}}
</style>
</head>
<body>
<main class="page">
 <article class="receipt">
  <header class="hero">
   <div class="top">
    <div class="status"><span class="check">${successful ? "✓" : "!"}</span><div>${successful ? "Payment successful" : "Transaction update"}<div class="eyebrow">${escapeHtml(r.service)} · ${escapeHtml(r.status)}</div></div></div>
    <span class="pill eyebrow">Receipt</span>
   </div>
   <p class="${amountSize}">${amount}</p>
   <p class="summary">${escapeHtml(plan || r.service)}${r.phone ? ` · ${escapeHtml(r.phone)}` : ""}</p>
  </header>
  <section class="reference"><div><div class="label">Order reference</div><div class="value">${escapeHtml(r.orderRef)}</div></div><strong>DataGrid</strong></section>
  <section class="details">
   <div class="row"><span>Service</span><strong>${escapeHtml(r.service)}</strong></div>
   ${plan ? `<div class="row"><span>Product</span><strong>${escapeHtml(plan)}</strong></div>` : ""}
   ${r.phone ? `<div class="row"><span>Phone</span><strong>${escapeHtml(r.phone)}</strong></div>` : ""}
   ${r.networkCode ? `<div class="row"><span>Network</span><strong>${escapeHtml(r.networkCode)}</strong></div>` : ""}
   ${r.customerName ? `<div class="row"><span>Customer</span><strong>${escapeHtml(r.customerName)}</strong></div>` : ""}
   ${r.meterNumber ? `<div class="row"><span>Meter</span><strong>${escapeHtml(r.meterNumber)}</strong></div>` : ""}
   ${r.smartCardNumber ? `<div class="row"><span>IUC</span><strong>${escapeHtml(r.smartCardNumber)}</strong></div>` : ""}
   <div class="row"><span>Status</span><strong>${escapeHtml(r.status)}</strong></div>
  </section>
  ${r.token ? `<section class="token"><div class="label">Token / pin</div><strong>${escapeHtml(r.token)}</strong></section>` : ""}
  <p class="foot">Generated securely by DataGrid.<br/>Transactions are final after delivery. Quote the order reference for support.</p>
 </article>
</main>
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
