import type { NormalizedPlanKey, ProviderId, ProviderPlan, QuoteCandidate, QuoteResult } from "../types.js";
export interface RouteSelection {
    plan: NormalizedPlanKey;
    baselinePriceNgn: number | null;
    selected: ProviderPlan | null;
    eligible: ProviderPlan[];
    candidates: QuoteCandidate[];
    error?: string;
}
/**
 * Price-aware routing:
 * 1. Exact plan match only (network + size + validity + productType).
 * 2. Eligible if price ≤ Alrahuz baseline for that plan.
 * 3. Among eligible, cheapest; ties by Gsubz → Semz → Gladtidings → Easy Access → Peyflex → Alrahuz.
 *    DataGifting is not in the tie-break.
 * 4. If none eligible, fall back to Alrahuz if it has the plan; else error.
 */
export declare function selectRoute(plan: NormalizedPlanKey, catalogs: Map<ProviderId, ProviderPlan[]>, options?: {
    preferProvider?: ProviderId;
}): RouteSelection;
/** Ordered failover list: selected first, then remaining eligible by same sort. */
export declare function failoverOrder(selection: RouteSelection): ProviderPlan[];
export declare function toQuoteResult(selection: RouteSelection): QuoteResult;
//# sourceMappingURL=router.d.ts.map