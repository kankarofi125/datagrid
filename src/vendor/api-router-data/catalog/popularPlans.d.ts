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
import type { Network, NormalizedPlanKey, ProductType } from "../types.js";
export interface PopularPlanDef {
    /** Stable id, e.g. mtn-cg-1gb-30d */
    id: string;
    network: Network;
    /** Human size label used in quotes ("1GB", "500MB"). */
    size: string;
    sizeMb: number;
    validityDays: number;
    productType: ProductType;
    label: string;
    /**
     * Research-snapshot Alrahuz Smart Earner price (NGN), when known.
     * null = no verified Alrahuz baseline in research — not a live price claim.
     */
    alrahuzFixturePriceNgn: number | null;
    /** True when price is from research fixtures only (not a live API quote). */
    fixtureOnly: boolean;
    notes?: string;
}
/** Canonical popular catalog — curated high-volume retail sizes. */
export declare const POPULAR_PLANS: PopularPlanDef[];
export declare function popularPlanToKey(plan: PopularPlanDef): NormalizedPlanKey;
export declare function popularPlanKeyString(plan: PopularPlanDef): string;
/** List popular plans, optionally filtered by network (accepts etisalat/9mobile aliases). */
export declare function listPopularPlans(network?: string | Network): PopularPlanDef[];
/** Group popular plans by network. */
export declare function popularPlansByNetwork(): Record<Network, PopularPlanDef[]>;
/** Quote-shaped request from a popular plan def. */
export declare function popularPlanToQuoteInput(plan: PopularPlanDef): {
    network: Network;
    size: string;
    validityDays: number;
    productType: ProductType;
};
/** Build NormalizedPlanKey from popular plan (same as toNormalizedKey). */
export declare function popularToNormalized(plan: PopularPlanDef): NormalizedPlanKey;
//# sourceMappingURL=popularPlans.d.ts.map