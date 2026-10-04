import type { ProviderId, PurchaseRequest, QuoteRequest, RouterConfig, StatusResult } from "./types.js";
import { DataRouterEngine } from "./orders/purchase.js";
import type { IdempotencyStore } from "./orders/idempotency.js";
export type { Network, ProductType, ProviderId, ProviderPlan, QuoteRequest, QuoteResult, PurchaseRequest, PurchaseResult, StatusResult, RouterConfig, ProviderConfigBase, NormalizedPlanKey, OrderStatus, } from "./types.js";
export { RouterError } from "./types.js";
export { parseSizeToMb, formatSizeMb, normalizeNetwork, normalizeProductType, planKey, toNormalizedKey, matchesPlan, } from "./catalog/normalize.js";
export { selectRoute, failoverOrder } from "./pricing/router.js";
export { TIE_BREAK_ORDER, tieBreakRank } from "./providers/registry.js";
export { MemoryIdempotencyStore } from "./orders/idempotency.js";
export type { IdempotencyStore } from "./orders/idempotency.js";
export { DataRouterEngine } from "./orders/purchase.js";
export { createHttpServer, startServer } from "./http/server.js";
export interface DataRouter {
    quote(req: QuoteRequest & {
        preferProvider?: ProviderId;
    }): ReturnType<DataRouterEngine["quote"]>;
    purchase(req: PurchaseRequest): ReturnType<DataRouterEngine["purchase"]>;
    getStatus(providerId: ProviderId, providerRef: string): Promise<StatusResult>;
    refreshCatalogs(): Promise<Partial<Record<ProviderId, number>>>;
    listPopularPlans: DataRouterEngine["listPopularPlans"];
    getPopularPlansMatrix: DataRouterEngine["getPopularPlansMatrix"];
    routePopularPlans: DataRouterEngine["routePopularPlans"];
    buildNetworkRoutingTable: DataRouterEngine["buildNetworkRoutingTable"];
    /** Underlying engine for advanced use / tests. */
    engine: DataRouterEngine;
}
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
export declare function createRouter(config: RouterConfig, opts?: {
    idempotency?: IdempotencyStore;
}): DataRouter;
export { POPULAR_PLANS, listPopularPlans, popularPlansByNetwork, popularPlanToKey, popularPlanKeyString, } from "./catalog/popularPlans.js";
export type { PopularPlanDef } from "./catalog/popularPlans.js";
export { routePopularPlan, routePopularPlans, buildNetworkRoutingTable, popularPlansMatrix, } from "./pricing/popularRouting.js";
export type { PopularRouteEntry, NetworkRoutingTable, RunnerUp, } from "./pricing/popularRouting.js";
export { createBillsRouter, BillsRouterEngine } from "./bills/router.js";
export type { BillsRouter } from "./bills/router.js";
export { BILLS_FAILOVER_ORDER } from "./bills/registry.js";
export { MemoryBillsIdempotencyStore } from "./bills/idempotency.js";
export type { BillsIdempotencyStore } from "./bills/idempotency.js";
export type { BillsProviderId, BillDomain, BillStatus, BillAdapterResult, AirtimeArgs, MeterType, MeterArgs, ElectricityArgs, IucArgs, CableArgs, ExamPinArgs, BillsProviderAdapter, BillAttempt, BillOrderResult, BillsRouterConfig, BillsProviderConfigBase, BillsVtpassConfig, BillsClubKonnectConfig, } from "./bills/types.js";
export { BillsRouterError } from "./bills/types.js";
//# sourceMappingURL=index.d.ts.map