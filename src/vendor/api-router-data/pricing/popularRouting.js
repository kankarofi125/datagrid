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
import { formatSizeMb, planKey } from "../catalog/normalize.js";
import { listPopularPlans, popularPlanKeyString, popularPlanToKey, POPULAR_PLANS, } from "../catalog/popularPlans.js";
import { cheapestMatchingPlan, resolveAlrahuzBaseline, } from "./alrahuzBaseline.js";
import { tieBreakRank } from "../providers/registry.js";
function sortByPriceThenTie(a, b) {
    if (a.priceNgn !== b.priceNgn)
        return a.priceNgn - b.priceNgn;
    return tieBreakRank(a.providerId) - tieBreakRank(b.providerId);
}
function collectMatching(plan, catalogs) {
    const matching = [];
    for (const [, plans] of catalogs) {
        const hit = cheapestMatchingPlan(plans, plan);
        if (hit)
            matching.push(hit);
    }
    return matching;
}
/**
 * Route a single popular plan to the cheapest eligible provider.
 */
export function routePopularPlan(popular, catalogs) {
    const plan = popularPlanToKey(popular);
    const key = popularPlanKeyString(popular);
    const alrahuzPlans = catalogs.get("alrahuz") ?? [];
    const baseline = resolveAlrahuzBaseline(alrahuzPlans, plan);
    const matching = collectMatching(plan, catalogs);
    const baseMeta = {
        network: popular.network,
        planKey: key,
        planId: popular.id,
        size: popular.size,
        sizeMb: popular.sizeMb,
        validityDays: popular.validityDays,
        productType: popular.productType,
        label: popular.label,
    };
    if (matching.length === 0) {
        return {
            ...baseMeta,
            chosenProvider: null,
            planCode: null,
            amount: null,
            alrahuzBaseline: baseline?.priceNgn ?? null,
            alrahuzBaselineMissing: !baseline,
            savingsVsAlrahuz: null,
            runnersUp: [],
            error: "No configured provider stocks this popular plan",
        };
    }
    let eligible;
    let alrahuzBaselineMissing = false;
    if (baseline) {
        eligible = matching.filter((p) => p.priceNgn <= baseline.priceNgn);
        // If somehow none ≤ baseline, fall back to Alrahuz itself when present
        if (eligible.length === 0) {
            const alr = matching.find((p) => p.providerId === "alrahuz");
            if (alr)
                eligible = [alr];
        }
    }
    else {
        alrahuzBaselineMissing = true;
        // Absolute cheapest among stocked providers
        eligible = [...matching];
    }
    if (eligible.length === 0) {
        return {
            ...baseMeta,
            chosenProvider: null,
            planCode: null,
            amount: null,
            alrahuzBaseline: baseline?.priceNgn ?? null,
            alrahuzBaselineMissing,
            savingsVsAlrahuz: null,
            runnersUp: [],
            error: "No eligible provider at or below Alrahuz baseline",
        };
    }
    const sorted = [...eligible].sort(sortByPriceThenTie);
    const chosen = sorted[0];
    const runnersUp = sorted.slice(1).map((p) => ({
        providerId: p.providerId,
        planCode: p.planCode,
        priceNgn: p.priceNgn,
    }));
    const amount = chosen.priceNgn;
    const alrahuzBaseline = baseline?.priceNgn ?? null;
    const savingsVsAlrahuz = alrahuzBaseline != null ? alrahuzBaseline - amount : null;
    return {
        ...baseMeta,
        chosenProvider: chosen.providerId,
        planCode: chosen.planCode,
        amount,
        alrahuzBaseline,
        alrahuzBaselineMissing,
        savingsVsAlrahuz,
        runnersUp,
    };
}
/**
 * Build cheapest-provider table for every popular plan (optionally one network).
 */
export function buildNetworkRoutingTable(catalogs, options) {
    const plans = listPopularPlans(options?.network);
    const entries = plans.map((p) => routePopularPlan(p, catalogs));
    const networks = {
        mtn: [],
        airtel: [],
        glo: [],
        "9mobile": [],
    };
    for (const e of entries) {
        networks[e.network].push(e);
    }
    return {
        generatedAt: new Date().toISOString(),
        networks,
        entries,
    };
}
/** Alias used by router API. */
export function routePopularPlans(catalogs, options) {
    return buildNetworkRoutingTable(catalogs, options);
}
/** Matrix view of the static popular catalog (no live prices). */
export function popularPlansMatrix(network) {
    const byNet = {
        mtn: [],
        airtel: [],
        glo: [],
        "9mobile": [],
    };
    for (const p of listPopularPlans(network)) {
        byNet[p.network].push(p);
    }
    return {
        count: POPULAR_PLANS.length,
        networks: byNet,
        plans: listPopularPlans(network).map((p) => ({
            ...p,
            planKey: planKey(popularPlanToKey(p)),
            sizeLabel: formatSizeMb(p.sizeMb),
        })),
    };
}
//# sourceMappingURL=popularRouting.js.map