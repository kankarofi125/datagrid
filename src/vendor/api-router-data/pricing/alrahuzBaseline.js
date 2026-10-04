import { matchesPlan } from "../catalog/normalize.js";
/**
 * Resolve Alrahuz baseline price for an exact normalized plan.
 * Returns null when Alrahuz has no matching SKU (cannot gate routing).
 */
/** Cheapest row when a provider lists the same SKU more than once. */
export function cheapestMatchingPlan(plans, plan) {
    let best;
    for (const row of plans) {
        if (!matchesPlan(row, plan))
            continue;
        if (!best || row.priceNgn < best.priceNgn)
            best = row;
    }
    return best;
}
export function resolveAlrahuzBaseline(alrahuzPlans, plan) {
    const hit = cheapestMatchingPlan(alrahuzPlans, plan);
    if (!hit)
        return null;
    return { priceNgn: hit.priceNgn, plan: hit };
}
//# sourceMappingURL=alrahuzBaseline.js.map