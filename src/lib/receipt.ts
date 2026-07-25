import brandMark from "@/img/image.png";
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
    "DATAGRID · OFFICIAL RECEIPT",
    "================================",
    `Reference: ${r.orderRef}`,
    `Status: ${r.status}`,
    `Service: ${humanize(r.service)}`,
    `Amount: ${formatNaira(r.amount)}`,
  ];
  if (r.phone) lines.push(`Recipient: ${r.phone}`);
  if (r.networkCode) lines.push(`Network: ${r.networkCode}`);
  if (r.customerName) lines.push(`Customer: ${r.customerName}`);
  if (r.meterNumber) lines.push(`Meter: ${r.meterNumber}`);
  if (r.smartCardNumber) lines.push(`IUC: ${r.smartCardNumber}`);
  if (r.meta?.planName) lines.push(`Product: ${r.meta.planName}`);
  if (r.token) lines.push(`Token/Pin: ${r.token}`);
  const issuedAt = r.deliveredAt || r.createdAt;
  if (issuedAt) lines.push(`Issued: ${formatReceiptDate(issuedAt)}`);
  lines.push(
    "--------------------------------",
    "VERIFIED BY DATAGRID",
    "Secure transaction record · quote the reference for support"
  );
  return lines.join("\n");
}

/** Print-ready receipt (open in a new window → Save as PDF). */
export function receiptHtml(r: ReceiptData) {
  const plan = r.meta?.planName || "";
  const successful = r.status === "DELIVERED";
  const service = humanize(r.service);
  const amount = escapeHtml(formatNaira(r.amount));
  const issuedAt = r.deliveredAt || r.createdAt;
  const issuedLabel = issuedAt ? formatReceiptDate(issuedAt) : "Issued instantly";
  const amountSize =
    amount.length > 23
      ? "amount amount-xs"
      : amount.length > 18
        ? "amount amount-sm"
        : amount.length > 14
          ? "amount amount-md"
          : "amount";

  return `<!DOCTYPE html>
<html lang="en-NG">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>DataGrid receipt · ${escapeHtml(r.orderRef)}</title>
<style>
  :root{--paper:#f5f3ec;--card:#fff;--ink:#0e211a;--green:#168653;--deep:#0a2e22;--amber:#f2a63d;--line:rgba(14,33,26,.11)}
  *{box-sizing:border-box}
  body{margin:0;background:#e9e5da;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:min(100% - 28px,440px);margin:28px auto}
  .receipt{overflow:hidden;border:1px solid rgba(14,33,26,.11);border-radius:24px;background:var(--card);box-shadow:0 28px 80px -38px rgba(7,31,23,.58)}
  .mono,.label,.value,.amount,.brand-sub,.receipt-kicker,.status-meta,.pill{font-family:ui-monospace,SFMono-Regular,"Roboto Mono",Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
  .masthead{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 18px}
  .brand{display:flex;align-items:center;gap:10px;min-width:0}
  .mark{position:relative;width:42px;height:42px;flex:0 0 auto;overflow:hidden}
  .mark img{width:100%;height:100%;object-fit:contain;transform:scale(1.55) translate(-4%,3%)}
  .brand-name{font-size:20px;font-weight:850;letter-spacing:.025em;line-height:1;color:var(--deep)}
  .brand-sub{margin-top:5px;color:rgba(14,33,26,.42);font-size:7px;text-transform:uppercase;letter-spacing:.16em}
  .receipt-meta{text-align:right}
  .receipt-kicker{color:var(--green);font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.18em}
  .issued{margin-top:5px;color:rgba(14,33,26,.4);font-size:7px;text-transform:uppercase;letter-spacing:.1em}
  .hero{background:${successful ? "var(--deep)" : "#702b2e"};padding:21px 19px 23px;color:var(--paper)}
  .top{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .status{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:750}
  .check{display:grid;width:36px;height:36px;place-items:center;border:1px solid ${successful ? "rgba(134,237,176,.25)" : "rgba(255,255,255,.16)"};border-radius:50%;background:${successful ? "rgba(134,237,176,.12)" : "rgba(255,255,255,.1)"};color:${successful ? "#86edb0" : "#fff"};font-size:18px}
  .status-meta{margin-top:4px;color:rgba(245,243,236,.48);font-size:7px;text-transform:uppercase;letter-spacing:.17em}
  .pill{border:1px solid ${successful ? "rgba(134,237,176,.2)" : "rgba(255,255,255,.15)"};border-radius:999px;background:${successful ? "rgba(134,237,176,.1)" : "rgba(255,255,255,.07)"};padding:6px 9px;color:${successful ? "#86edb0" : "rgba(255,255,255,.75)"};font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.14em}
  .total{margin:27px 0 0;color:rgba(245,243,236,.44);font-size:7px;text-transform:uppercase;letter-spacing:.2em}
  .amount{margin:7px 0 0;font-size:40px;font-weight:800;letter-spacing:-.055em;line-height:1;white-space:nowrap}
  .amount-md{font-size:31px}.amount-sm{font-size:25px}.amount-xs{font-size:20px}
  .summary{margin:10px 0 0;color:rgba(245,243,236,.56);font-size:11px;line-height:1.5}
  .perforation{position:relative;height:22px;background:#fff}
  .perforation:before,.perforation:after{position:absolute;top:50%;width:20px;height:20px;border:1px solid rgba(14,33,26,.1);border-radius:50%;background:var(--paper);content:""}
  .perforation:before{left:-11px;transform:translateY(-50%)}.perforation:after{right:-11px;transform:translateY(-50%)}
  .perforation span{position:absolute;top:50%;right:14px;left:14px;border-top:1px dashed rgba(14,33,26,.16)}
  .body{padding:0 18px 18px}
  .reference{border:1px dashed rgba(14,33,26,.2);border-radius:14px;background:rgba(245,243,236,.65);padding:12px 14px}
  .label{color:rgba(14,33,26,.4);font-size:7px;text-transform:uppercase;letter-spacing:.17em}
  .value{margin-top:6px;font-size:12px;font-weight:750;letter-spacing:.025em;word-break:break-all}
  .details{margin-top:12px;overflow:hidden;border:1px solid var(--line);border-radius:14px;background:#fff}
  .row{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;border-bottom:1px solid var(--line);padding:10px 13px}
  .row:last-child{border-bottom:0}.row .label{padding-top:2px}.row strong{max-width:68%;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.5}.row .success{color:var(--green)}
  .token{margin-top:12px;border:1px solid var(--deep);border-radius:16px;background:var(--deep);padding:16px;color:var(--paper)}
  .token .label{color:var(--amber)}.token small{display:block;margin-top:5px;color:rgba(245,243,236,.45);font-size:9px}
  .token strong{display:block;margin-top:14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:21px;line-height:1.55;letter-spacing:.1em;word-break:break-all}
  .verify{display:flex;align-items:center;gap:10px;margin-top:16px;border-top:1px dashed rgba(14,33,26,.15);padding-top:14px}
  .shield{display:grid;width:32px;height:32px;flex:0 0 auto;place-items:center;border-radius:50%;background:rgba(22,134,83,.08);color:var(--green);font-size:15px}
  .verify strong{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:8px;text-transform:uppercase;letter-spacing:.12em}
  .verify span:last-child{display:block;margin-top:4px;color:rgba(14,33,26,.44);font-size:9px;line-height:1.4}
  .foot{margin:14px 4px 0;text-align:center;color:rgba(14,33,26,.44);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:8px;line-height:1.6;letter-spacing:.04em}
  @media(max-width:460px){.page{margin:14px auto}.receipt{border-radius:20px}.masthead{padding:12px 15px}.hero{padding-inline:16px}.body{padding-inline:15px}.amount{font-size:35px}.amount-md{font-size:28px}.amount-sm{font-size:23px}.amount-xs{font-size:18px}}
  @media print{body{background:#fff}.page{width:100%;margin:0}.receipt{border:1px solid rgba(14,33,26,.1);box-shadow:none}}
</style>
</head>
<body>
<main class="page">
 <article class="receipt">
  <header class="masthead">
   <div class="brand">
    <span class="mark"><img src="${escapeHtml(brandMark.src)}" alt=""/></span>
    <div><div class="brand-name">DATAGRID</div><div class="brand-sub">Secure payment network</div></div>
   </div>
   <div class="receipt-meta"><div class="receipt-kicker">Official receipt</div><div class="issued">${escapeHtml(issuedLabel)}</div></div>
  </header>
  <section class="hero">
   <div class="top">
    <div class="status"><span class="check">${successful ? "✓" : "!"}</span><div>${successful ? "Payment confirmed" : "Transaction update"}<div class="status-meta">${escapeHtml(service)} · ${escapeHtml(r.status)}</div></div></div>
    <span class="pill">${successful ? "Verified" : escapeHtml(r.status)}</span>
   </div>
   <p class="total mono">Total paid</p>
   <p class="${amountSize}">${amount}</p>
   <p class="summary">${escapeHtml(plan || service)}${r.phone ? ` · ${escapeHtml(r.phone)}` : ""}</p>
  </section>
  <div class="perforation"><span></span></div>
  <div class="body">
   <section class="reference"><div class="label">Transaction reference</div><div class="value">${escapeHtml(r.orderRef)}</div></section>
   <section class="details">
    ${receiptRow("Service", service)}
    ${plan ? receiptRow("Product", plan) : ""}
    ${r.phone ? receiptRow("Recipient", r.phone) : ""}
    ${r.networkCode ? receiptRow("Network", r.networkCode) : ""}
    ${r.customerName ? receiptRow("Customer", r.customerName) : ""}
    ${r.meterNumber ? receiptRow("Meter", r.meterNumber) : ""}
    ${r.smartCardNumber ? receiptRow("IUC", r.smartCardNumber) : ""}
    ${receiptRow("Issued", issuedLabel)}
    ${receiptRow("Status", r.status, successful)}
   </section>
   ${
     r.token
       ? `<section class="token"><div class="label">Token / pin</div><small>Keep this code private</small><strong>${escapeHtml(r.token)}</strong></section>`
       : ""
   }
   <section class="verify"><span class="shield">✓</span><div><strong>Verified by DataGrid</strong><span>Secure transaction record · quote the reference for support</span></div></section>
   <p class="foot">DATAGRID.NG · TRANSACTIONS ARE FINAL AFTER DELIVERY</p>
  </div>
 </article>
</main>
<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)})</script>
</body>
</html>`;
}

function receiptRow(label: string, value: string, accent = false) {
  return `<div class="row"><span class="label">${escapeHtml(label)}</span><strong${accent ? ' class="success"' : ""}>${escapeHtml(value)}</strong></div>`;
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatReceiptDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Issued instantly";
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }).format(date);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
