/**
 * High-volume Nigerian retail DATA plans used for per-network cheapest routing.
 *
 * Refresh guidance (see README):
 * 1. Re-check Alrahuz /pricing/ + competitor catalogs quarterly (or after tariff churn).
 * 2. Keep only SKUs that retail VTU shops actually sell in volume.
 * 3. Set alrahuzFixturePriceNgn only from verified research/fixtures — never invent live prices.
 * 4. When Alrahuz has no public SKU, leave alrahuzFixturePriceNgn null; live routing still
 *    picks the absolute cheapest configured provider and flags alrahuzBaselineMissing.
 *
 * Snapshot note: fixture baselines below come from
 * /workspace/alrahuz-vtu-research/REPORT.md (2026-09-21 WAT) where available.
 * The 2026-09-25 recheck (RESEARCH.md) did not add or remove high-volume SKUs.
 * alrahuzFixturePriceNgn stays that older snapshot. It is not a new live quote.
 */
import { formatSizeMb, normalizeNetwork, parseSizeToMb, planKey, toNormalizedKey, } from "./normalize.js";
function def(partial) {
    const sizeMb = parseSizeToMb(partial.size);
    const id = partial.id ??
        [
            partial.network,
            partial.productType,
            formatSizeMb(sizeMb).toLowerCase(),
            `${partial.validityDays}d`,
        ].join("-");
    return {
        id,
        network: partial.network,
        size: partial.size,
        sizeMb,
        validityDays: partial.validityDays,
        productType: partial.productType,
        label: partial.label,
        alrahuzFixturePriceNgn: partial.alrahuzFixturePriceNgn,
        fixtureOnly: partial.fixtureOnly ?? true,
        notes: partial.notes,
    };
}
/** Canonical popular catalog — curated high-volume retail sizes. */
export const POPULAR_PLANS = [
    // ─── MTN ───────────────────────────────────────────────────────────
    def({
        network: "mtn",
        size: "500MB",
        validityDays: 7,
        productType: "cg",
        label: "MTN 500MB CG 7 days",
        alrahuzFixturePriceNgn: 310,
    }),
    def({
        network: "mtn",
        size: "1GB",
        validityDays: 30,
        productType: "sme",
        label: "MTN 1GB SME 30 days",
        alrahuzFixturePriceNgn: 250,
    }),
    def({
        network: "mtn",
        size: "1GB",
        validityDays: 30,
        productType: "cg",
        label: "MTN 1GB CG 30 days",
        alrahuzFixturePriceNgn: 500,
    }),
    def({
        network: "mtn",
        size: "1.5GB",
        validityDays: 30,
        productType: "cg",
        label: "MTN 1.5GB CG 30 days",
        alrahuzFixturePriceNgn: null,
        notes: "Common retail size; no verified Alrahuz Smart Earner row in research snapshot",
    }),
    def({
        network: "mtn",
        size: "2GB",
        validityDays: 30,
        productType: "cg",
        label: "MTN 2GB CG 30 days",
        alrahuzFixturePriceNgn: 800,
    }),
    def({
        network: "mtn",
        size: "2GB",
        validityDays: 30,
        productType: "sme2",
        label: "MTN 2GB SME2 30 days",
        alrahuzFixturePriceNgn: 1450,
    }),
    def({
        network: "mtn",
        size: "3GB",
        validityDays: 30,
        productType: "cg",
        label: "MTN 3GB CG 30 days",
        alrahuzFixturePriceNgn: null,
        notes: "High-volume retail; Alrahuz baseline left to live catalog discovery",
    }),
    def({
        network: "mtn",
        size: "5GB",
        validityDays: 30,
        productType: "cg",
        label: "MTN 5GB CG 30 days",
        alrahuzFixturePriceNgn: 1600,
    }),
    def({
        network: "mtn",
        size: "10GB",
        validityDays: 30,
        productType: "sme2",
        label: "MTN 10GB SME2 monthly",
        alrahuzFixturePriceNgn: 4400,
        notes: "Research range 4400–4450; fixture uses lower bound",
    }),
    // ─── Airtel ────────────────────────────────────────────────────────
    def({
        network: "airtel",
        size: "1GB",
        validityDays: 30,
        productType: "cg",
        label: "Airtel 1GB CG 30 days",
        alrahuzFixturePriceNgn: null,
        notes: "Common bundle; Alrahuz public table mixed atypical sizes (1.2GB/3.2GB)",
    }),
    def({
        network: "airtel",
        size: "1.5GB",
        validityDays: 30,
        productType: "cg",
        label: "Airtel 1.5GB CG 30 days",
        alrahuzFixturePriceNgn: null,
    }),
    def({
        network: "airtel",
        size: "2GB",
        validityDays: 30,
        productType: "cg",
        label: "Airtel 2GB CG 30 days",
        alrahuzFixturePriceNgn: 1470,
    }),
    def({
        network: "airtel",
        size: "5GB",
        validityDays: 30,
        productType: "cg",
        label: "Airtel 5GB CG 30 days",
        alrahuzFixturePriceNgn: null,
    }),
    def({
        network: "airtel",
        size: "10GB",
        validityDays: 30,
        productType: "cg",
        label: "Airtel 10GB CG 30 days",
        alrahuzFixturePriceNgn: 3200,
    }),
    // ─── Glo ───────────────────────────────────────────────────────────
    def({
        network: "glo",
        size: "1GB",
        validityDays: 30,
        productType: "cg",
        label: "Glo 1GB CG 30 days",
        alrahuzFixturePriceNgn: 400,
    }),
    def({
        network: "glo",
        size: "2GB",
        validityDays: 30,
        productType: "cg",
        label: "Glo 2GB CG 30 days",
        alrahuzFixturePriceNgn: 800,
    }),
    def({
        network: "glo",
        size: "5GB",
        validityDays: 30,
        productType: "cg",
        label: "Glo 5GB CG 30 days",
        alrahuzFixturePriceNgn: 2000,
    }),
    def({
        network: "glo",
        size: "10GB",
        validityDays: 30,
        productType: "cg",
        label: "Glo 10GB CG 30 days",
        alrahuzFixturePriceNgn: 4000,
    }),
    // ─── 9mobile (etisalat alias normalizes here) ───────────────────────
    def({
        network: "9mobile",
        size: "500MB",
        validityDays: 30,
        productType: "sme",
        label: "9mobile 500MB SME 30 days",
        alrahuzFixturePriceNgn: 240,
    }),
    def({
        network: "9mobile",
        size: "1GB",
        validityDays: 30,
        productType: "sme",
        label: "9mobile 1GB SME 30 days",
        alrahuzFixturePriceNgn: 480,
    }),
    def({
        network: "9mobile",
        size: "1GB",
        validityDays: 30,
        productType: "cg",
        label: "9mobile 1GB CG 30 days",
        alrahuzFixturePriceNgn: 480,
        notes: "Research also lists 1GB/1 month @ 220 (likely different product); CG uses 480",
    }),
    def({
        network: "9mobile",
        size: "2GB",
        validityDays: 30,
        productType: "sme",
        label: "9mobile 2GB SME monthly",
        alrahuzFixturePriceNgn: 720,
    }),
];
export function popularPlanToKey(plan) {
    return {
        network: plan.network,
        sizeMb: plan.sizeMb,
        validityDays: plan.validityDays,
        productType: plan.productType,
    };
}
export function popularPlanKeyString(plan) {
    return planKey(popularPlanToKey(plan));
}
/** List popular plans, optionally filtered by network (accepts etisalat/9mobile aliases). */
export function listPopularPlans(network) {
    if (!network)
        return [...POPULAR_PLANS];
    const n = normalizeNetwork(network);
    return POPULAR_PLANS.filter((p) => p.network === n);
}
/** Group popular plans by network. */
export function popularPlansByNetwork() {
    const out = {
        mtn: [],
        airtel: [],
        glo: [],
        "9mobile": [],
    };
    for (const p of POPULAR_PLANS) {
        out[p.network].push(p);
    }
    return out;
}
/** Quote-shaped request from a popular plan def. */
export function popularPlanToQuoteInput(plan) {
    return {
        network: plan.network,
        size: plan.size,
        validityDays: plan.validityDays,
        productType: plan.productType,
    };
}
/** Build NormalizedPlanKey from popular plan (same as toNormalizedKey). */
export function popularToNormalized(plan) {
    return toNormalizedKey(plan.network, plan.size, plan.validityDays, plan.productType);
}
//# sourceMappingURL=popularPlans.js.map