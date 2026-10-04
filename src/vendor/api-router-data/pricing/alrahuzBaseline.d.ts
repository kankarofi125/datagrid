import type { NormalizedPlanKey, ProviderPlan } from "../types.js";
/**
 * Resolve Alrahuz baseline price for an exact normalized plan.
 * Returns null when Alrahuz has no matching SKU (cannot gate routing).
 */
/** Cheapest row when a provider lists the same SKU more than once. */
export declare function cheapestMatchingPlan(plans: ProviderPlan[], plan: NormalizedPlanKey): ProviderPlan | undefined;
export declare function resolveAlrahuzBaseline(alrahuzPlans: ProviderPlan[], plan: NormalizedPlanKey): {
    priceNgn: number;
    plan: ProviderPlan;
} | null;
//# sourceMappingURL=alrahuzBaseline.d.ts.map