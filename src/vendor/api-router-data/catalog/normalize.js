const NETWORK_ALIASES = {
    mtn: "mtn",
    "1": "mtn",
    airtel: "airtel",
    "2": "airtel",
    glo: "glo",
    "3": "glo",
    "9mobile": "9mobile",
    etisalat: "9mobile",
    "4": "9mobile",
};
const PRODUCT_ALIASES = {
    sme: "sme",
    "sme-data": "sme",
    sme2: "sme2",
    "sme-2": "sme2",
    cg: "cg",
    "c.g": "cg",
    "c.g.": "cg",
    "cg-data": "cg",
    corporate: "cg",
    "corporate gifting": "cg",
    gifting: "gifting",
    gift: "gifting",
    "shared-data": "gifting",
    direct: "direct",
    "dd-data": "direct",
    awoof: "unknown",
    unknown: "unknown",
};
/**
 * Parse human size labels into megabytes.
 * 1GB = 1024 MB (binary convention common in Nigerian VTU tables).
 */
export function parseSizeToMb(size) {
    if (typeof size === "number" && Number.isFinite(size)) {
        return Math.round(size);
    }
    const s = String(size).trim().toLowerCase().replace(/\s+/g, "");
    const m = s.match(/^(\d+(?:\.\d+)?)\s*(gb|mb|tb)?$/i);
    if (!m) {
        throw new Error(`Unrecognized size: ${size}`);
    }
    const n = Number(m[1]);
    const unit = (m[2] || "mb").toLowerCase();
    if (unit === "tb")
        return Math.round(n * 1024 * 1024);
    if (unit === "gb")
        return Math.round(n * 1024);
    return Math.round(n);
}
export function formatSizeMb(sizeMb) {
    if (sizeMb >= 1024 && sizeMb % 1024 === 0) {
        return `${sizeMb / 1024}GB`;
    }
    if (sizeMb >= 1024) {
        const gb = sizeMb / 1024;
        return `${Number(gb.toFixed(2))}GB`;
    }
    return `${sizeMb}MB`;
}
export function normalizeNetwork(raw) {
    const key = String(raw).trim().toLowerCase();
    const n = NETWORK_ALIASES[key];
    if (!n)
        throw new Error(`Unrecognized network: ${raw}`);
    return n;
}
export function normalizeProductType(raw) {
    if (!raw)
        return "unknown";
    const key = String(raw).trim().toLowerCase();
    return PRODUCT_ALIASES[key] ?? inferProductTypeFromLabel(key);
}
/** Best-effort from free-text plan labels (SME, C.G, etc.). */
export function inferProductTypeFromLabel(label) {
    const l = label.toLowerCase();
    if (/\bsme\s*2\b|\bsme2\b/.test(l))
        return "sme2";
    if (/\bsme\b/.test(l))
        return "sme";
    if (/\bc\.?\s*g\.?\b|\bcg\b|corporate/.test(l))
        return "cg";
    if (/\bgift/.test(l))
        return "gifting";
    if (/\bdirect\b|\bdd\b/.test(l))
        return "direct";
    return "unknown";
}
export function planKey(plan) {
    return [
        plan.network,
        plan.sizeMb,
        plan.validityDays,
        plan.productType,
    ].join("|");
}
export function toNormalizedKey(network, size, validityDays, productType) {
    return {
        network: normalizeNetwork(network),
        sizeMb: parseSizeToMb(size),
        validityDays: Math.round(Number(validityDays)),
        productType: normalizeProductType(productType),
    };
}
export function matchesPlan(a, b) {
    return (a.network === b.network &&
        a.sizeMb === b.sizeMb &&
        a.validityDays === b.validityDays &&
        a.productType === b.productType);
}
/**
 * Validity buckets: treat 21–31 day "monthly" rows as matching requested 30
 * when both are in the monthly band — but only for equality within same band.
 * For routing we require exact validityDays from the quote request; catalogs
 * should expose the day value they advertise. Helpers below aid adapters.
 */
export function parseValidityDays(raw) {
    if (typeof raw === "number" && Number.isFinite(raw))
        return Math.round(raw);
    if (!raw)
        return 30;
    const s = String(raw).toLowerCase();
    // "21 days to 30days" and "21-30 days" are the monthly bucket. The first
    // day number alone would store 21 and miss the 30-day SKU.
    const span = s.match(/(\d+)\s*(?:days?)?\s*(to|[-–])\s*(\d+)\s*days?/);
    if (span) {
        const a = Number(span[1]);
        const b = Number(span[3]);
        if (a >= 20 && a <= 31 && b >= 20 && b <= 31)
            return 30;
        if (span[2] !== "to")
            return Math.round((a + b) / 2);
    }
    const days = s.match(/(\d+)\s*days?/);
    if (days)
        return Number(days[1]);
    if (/month|1\s*month|monthly/.test(s))
        return 30;
    if (/week|weekly|7\s*d/.test(s))
        return 7;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : 30;
}
//# sourceMappingURL=normalize.js.map