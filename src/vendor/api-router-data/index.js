import { buildProviderRegistry } from "./providers/registry.js";
import { DataRouterEngine } from "./orders/purchase.js";
export { RouterError } from "./types.js";
export { parseSizeToMb, formatSizeMb, normalizeNetwork, normalizeProductType, planKey, toNormalizedKey, matchesPlan, } from "./catalog/normalize.js";
export { selectRoute, failoverOrder } from "./pricing/router.js";
export { TIE_BREAK_ORDER, tieBreakRank } from "./providers/registry.js";
export { MemoryIdempotencyStore } from "./orders/idempotency.js";
export { DataRouterEngine } from "./orders/purchase.js";
export { createHttpServer, startServer } from "./http/server.js";
/**
 * Create a price-aware multi-provider DATA router.
 *
 * @example
 * ```ts
 * const router = createRouter({
 *   providers: {
 *     alrahuz: { enabled: true, baseUrl: process.env.ALRAHUZ_BASE_URL!, apiToken: process.env.ALRAHUZ_TOKEN },
 *     easyaccess: { enabled: true, baseUrl: process.env.EASYACCESS_BASE_URL!, apiToken: process.env.EASYACCESS_TOKEN },
 *     datagifting: { enabled: false, baseUrl: "https://v6.datagifting.com.ng", apiKey: process.env.DG_API_KEY },
 *   },
 * });
 * const q = await router.quote({ network: "mtn", size: "1GB", validityDays: 30, productType: "cg" });
 * ```
 */
export function createRouter(config, opts) {
    const adapters = buildProviderRegistry(config);
    const engine = new DataRouterEngine(config, adapters, opts?.idempotency);
    return {
        quote: (req) => engine.quote(req),
        purchase: (req) => engine.purchase(req),
        getStatus: (providerId, providerRef) => engine.getStatus(providerId, providerRef),
        refreshCatalogs: () => engine.refreshCatalogs(),
        listPopularPlans: (network) => engine.listPopularPlans(network),
        getPopularPlansMatrix: (network) => engine.getPopularPlansMatrix(network),
        routePopularPlans: (opts) => engine.routePopularPlans(opts),
        buildNetworkRoutingTable: (opts) => engine.buildNetworkRoutingTable(opts),
        engine,
    };
}
export { POPULAR_PLANS, listPopularPlans, popularPlansByNetwork, popularPlanToKey, popularPlanKeyString, } from "./catalog/popularPlans.js";
export { routePopularPlan, routePopularPlans, buildNetworkRoutingTable, popularPlansMatrix, } from "./pricing/popularRouting.js";
// Bills + airtime (ordered failover across VTpass / ClubKonnect).
export { createBillsRouter, BillsRouterEngine } from "./bills/router.js";
export { BILLS_FAILOVER_ORDER } from "./bills/registry.js";
export { MemoryBillsIdempotencyStore } from "./bills/idempotency.js";
export { BillsRouterError } from "./bills/types.js";
//# sourceMappingURL=index.js.map