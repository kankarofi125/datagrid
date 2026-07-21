/** Nigerian phone normalization + network prefix detection */

/**
 * Local MSISDN is 11 digits: leading 0 + 10-digit national number.
 * Example: 08125679851 → E.164 +2348125679851 (10 digits after country code).
 */
export const NG_LOCAL_MAX_DIGITS = 11;
/** Digits after dropping the leading 0 (or after +234). */
export const NG_NSN_MAX_DIGITS = 10;

export type NetworkCode = "MTN" | "GLO" | "AIRTEL" | "NINEMOBILE";

export const DEFAULT_PREFIXES: Record<NetworkCode, string[]> = {
  MTN: [
    "0703", "0706", "0803", "0806", "0810", "0813", "0814", "0816", "0903", "0906",
    "0913", "0916",
  ],
  GLO: ["0805", "0807", "0811", "0815", "0905", "0915"],
  AIRTEL: ["0708", "0802", "0808", "0812", "0701", "0901", "0902", "0907"],
  NINEMOBILE: ["0809", "0817", "0818", "0908", "0909"],
};

export const NETWORK_COLORS: Record<NetworkCode, string> = {
  MTN: "#FFCC00",
  GLO: "#3DAE2B",
  AIRTEL: "#E4002B",
  NINEMOBILE: "#00A94F",
};

export const NETWORK_LABELS: Record<NetworkCode, string> = {
  MTN: "MTN",
  GLO: "Glo",
  AIRTEL: "Airtel",
  NINEMOBILE: "9mobile",
};

/**
 * Sanitize live typing/paste into local digit form (max 11).
 * Accepts 0812…, 812…, 234812…, +234812… and caps length.
 */
export function sanitizeNgPhoneInput(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("234")) {
    // +234 / 234 → strip country code; keep at most 10 NSN digits after
    d = d.slice(3);
    if (d.startsWith("0")) d = d.slice(1);
    d = "0" + d.slice(0, NG_NSN_MAX_DIGITS);
  } else if (d.startsWith("0")) {
    d = d.slice(0, NG_LOCAL_MAX_DIGITS);
  } else {
    // National number without leading 0 — allow up to 10 digits
    d = d.slice(0, NG_NSN_MAX_DIGITS);
  }
  return d;
}

/** Digits only local form starting with 0, or null */
export function toLocalPhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("234")) {
    d = d.slice(3);
    if (d.startsWith("0")) d = d.slice(1);
    if (d.length === NG_NSN_MAX_DIGITS) d = "0" + d;
  }
  if (d.length === NG_NSN_MAX_DIGITS && !d.startsWith("0")) d = "0" + d;
  if (d.length === NG_LOCAL_MAX_DIGITS && d.startsWith("0")) return d;
  return null;
}

/** E.164 +234… */
export function toE164(input: string): string | null {
  const local = toLocalPhone(input);
  if (!local) return null;
  return "+234" + local.slice(1);
}

export function formatPhoneDisplay(input: string): string {
  const local = toLocalPhone(input);
  if (!local) return input;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

export function detectNetwork(
  input: string,
  prefixMap?: Record<string, NetworkCode>
): NetworkCode | null {
  const local = toLocalPhone(input);
  if (!local || local.length < 4) {
    // partial detect from typed digits
    const digits = input.replace(/\D/g, "");
    let candidate = digits;
    if (candidate.startsWith("234")) candidate = "0" + candidate.slice(3);
    if (candidate.length >= 4) {
      const p4 = candidate.slice(0, 4);
      return lookupPrefix(p4, prefixMap);
    }
    return null;
  }
  return lookupPrefix(local.slice(0, 4), prefixMap);
}

function lookupPrefix(
  prefix: string,
  prefixMap?: Record<string, NetworkCode>
): NetworkCode | null {
  if (prefixMap && prefixMap[prefix]) return prefixMap[prefix];
  for (const [code, list] of Object.entries(DEFAULT_PREFIXES) as [
    NetworkCode,
    string[],
  ][]) {
    if (list.includes(prefix)) return code;
  }
  return null;
}

export function buildPrefixMap(
  rows: { prefix: string; networkCode: string }[]
): Record<string, NetworkCode> {
  const map: Record<string, NetworkCode> = {};
  for (const r of rows) {
    map[r.prefix] = r.networkCode as NetworkCode;
  }
  return map;
}
