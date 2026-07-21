/** Naira formatting — kobo precision, en-NG locale */

const nairaFmt = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nairaCompact = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatNaira(amount: number | string, opts?: { compact?: boolean }) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(n)) return "₦0.00";
  return opts?.compact ? nairaCompact.format(n) : nairaFmt.format(n);
}

export function formatNairaMono(amount: number | string) {
  return formatNaira(amount);
}

/** Round to kobo (2 dp) */
export function toKoboSafe(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  const n = Number(cleaned);
  if (Number.isNaN(n) || n < 0) return null;
  return toKoboSafe(n);
}
