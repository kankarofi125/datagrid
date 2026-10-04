import { cheapestMatchingPlan, resolveAlrahuzBaseline, } from "./alrahuzBaseline.js";
import { tieBreakRank } from "../providers/registry.js";
/**
 * Price-aware routing:
 * 1. Exact plan match only (network + size + validity + productType).
 * 2. Eligible if price ≤ Alrahuz baseline for that plan.
 * 3. Among eligible, cheapest; ties by Gsubz → Semz → Gladtidings → Easy Access → Peyflex → Alrahuz.
 *    DataGifting is not in the tie-break.
 * 4. If none eligible, fall back to Alrahuz if it has the plan; else error.
 */
export function selectRoute(plan, catalogs, options) {
    const alrahuzPlans = catalogs.get("alrahuz") ?? [];
    const baseline = resolveAlrahuzBaseline(alrahuzPlans, plan);
    const candidates = [];
    const matching = [];
    for (const [providerId, plans] of catalogs) {
        const hit = cheapestMatchingPlan(plans, plan);
        if (!hit) {
            candidates.push({
                providerId,
                planCode: "",
                priceNgn: NaN,
                eligible: false,
                reason: "no_matching_plan",
            });
            continue;
        }
        matching.push(hit);
        if (!baseline) {
            // Without baseline we only allow Alrahuz itself.
            const eligible = providerId === "alrahuz";
            candidates.push({
                providerId,
                planCode: hit.planCode,
                priceNgn: hit.priceNgn,
                eligible,
                reason: eligible
                    ? "baseline_missing_alrahuz_only"
                    : "no_alrahuz_baseline",
            });
            continue;
        }
        if (hit.priceNgn <= baseline.priceNgn) {
            candidates.push({
                providerId,
                planCode: hit.planCode,
                priceNgn: hit.priceNgn,
                eligible: true,
                reason: "price_le_baseline",
            });
        }
        else {
            candidates.push({
                providerId,
                planCode: hit.planCode,
                priceNgn: hit.priceNgn,
                eligible: false,
                reason: `price_above_baseline(${hit.priceNgn}>${baseline.priceNgn})`,
            });
        }
    }
    const eligible = matching.filter((p) => {
        const c = candidates.find((x) => x.providerId === p.providerId && x.planCode === p.planCode);
        return c?.eligible === true;
    });
    let selected = null;
    if (options?.preferProvider) {
        const pref = eligible.find((p) => p.providerId === options.preferProvider);
        if (pref)
            selected = pref;
    }
    if (!selected && eligible.length > 0) {
        selected = [...eligible].sort((a, b) => {
            if (a.priceNgn !== b.priceNgn)
                return a.priceNgn - b.priceNgn;
            return tieBreakRank(a.providerId) - tieBreakRank(b.providerId);
        })[0];
    }
    if (!selected) {
        // Rule 4: use Alrahuz if configured with this plan
        const alrahuzHit = matching.find((p) => p.providerId === "alrahuz");
        if (alrahuzHit) {
            selected = alrahuzHit;
        }
    }
    const error = !selected && !baseline
        ? "No Alrahuz baseline for this plan and no eligible provider"
        : !selected
            ? "No provider at or below Alrahuz baseline for this plan"
            : undefined;
    return {
        plan,
        baselinePriceNgn: baseline?.priceNgn ?? null,
        selected,
        eligible,
        candidates,
        error,
    };
}
/** Ordered failover list: selected first, then remaining eligible by same sort. */
export function failoverOrder(selection) {
    if (!selection.selected && selection.eligible.length === 0)
        return [];
    const sorted = [...selection.eligible].sort((a, b) => {
        if (a.priceNgn !== b.priceNgn)
            return a.priceNgn - b.priceNgn;
        return tieBreakRank(a.providerId) - tieBreakRank(b.providerId);
    });
    if (!selection.selected)
        return sorted;
    const rest = sorted.filter((p) => !(p.providerId === selection.selected.providerId &&
        p.planCode === selection.selected.planCode));
    // If selected was Alrahuz fallback outside eligible, put it first then eligible
    if (!selection.eligible.some((p) => p.providerId === selection.selected.providerId &&
        p.planCode === selection.selected.planCode)) {
        return [selection.selected, ...sorted];
    }
    return [selection.selected, ...rest];
}
export function toQuoteResult(selection) {
    return {
        plan: selection.plan,
        baselinePriceNgn: selection.baselinePriceNgn,
        selected: selection.selected
            ? {
                providerId: selection.selected.providerId,
                planCode: selection.selected.planCode,
                priceNgn: selection.selected.priceNgn,
                eligible: true,
            }
            : null,
        candidates: selection.candidates,
        error: selection.error,
    };
}
//# sourceMappingURL=router.js.map