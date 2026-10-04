/**
 * Per-network cheapest routing over the popular-plans catalog.
 *
 * Rules:
 * - Prefer providers that have the exact popular plan in catalog.
 * - When Alrahuz baseline exists: only providers with price ≤ baseline; pick cheapest
 *   (tie-break same as selectRoute).
 * - When Alrahuz has no SKU: pick absolute cheapest among providers that stock the plan
 *   and set alrahuzBaselineMissing: true.
 */
import type { Network, ProviderId, ProviderPlan } from "../types.js";
import { type PopularPlanDef } from "../catalog/popularPlans.js";
export interface RunnerUp {
    providerId: ProviderId;
    planCode: string;
    priceNgn: number;
}
export interface PopularRouteEntry {
    network: Network;
    planKey: string;
    planId: string;
    size: string;
    sizeMb: number;
    validityDays: number;
    productType: PopularPlanDef["productType"];
    label: string;
    chosenProvider: ProviderId | null;
    planCode: string | null;
    amount: number | null;
    alrahuzBaseline: number | null;
    alrahuzBaselineMissing: boolean;
    /** baseline - amount when both present; null otherwise. */
    savingsVsAlrahuz: number | null;
    runnersUp: RunnerUp[];
    error?: string;
}
export interface NetworkRoutingTable {
    generatedAt: string;
    networks: Record<Network, PopularRouteEntry[]>;
    /** Flat list for convenience. */
    entries: PopularRouteEntry[];
}
/**
 * Route a single popular plan to the cheapest eligible provider.
 */
export declare function routePopularPlan(popular: PopularPlanDef, catalogs: Map<ProviderId, ProviderPlan[]>): PopularRouteEntry;
/**
 * Build cheapest-provider table for every popular plan (optionally one network).
 */
export declare function buildNetworkRoutingTable(catalogs: Map<ProviderId, ProviderPlan[]>, options?: {
    network?: string | Network;
}): NetworkRoutingTable;
/** Alias used by router API. */
export declare function routePopularPlans(catalogs: Map<ProviderId, ProviderPlan[]>, options?: {
    network?: string | Network;
}): NetworkRoutingTable;
/** Matrix view of the static popular catalog (no live prices). */
export declare function popularPlansMatrix(network?: string | Network): {
    count: number;
    networks: {
        mtn: PopularPlanDef[];
        airtel: PopularPlanDef[];
        glo: PopularPlanDef[];
        "9mobile": PopularPlanDef[];
    };
    plans: {
        planKey: string;
        sizeLabel: string;
        id: string;
        network: Network;
        size: string;
        sizeMb: number;
        validityDays: number;
        productType: import("../types.js").ProductType;
        label: string;
        alrahuzFixturePriceNgn: number | null;
        fixtureOnly: boolean;
        notes?: string;
    }[];
};
//# sourceMappingURL=popularRouting.d.ts.map