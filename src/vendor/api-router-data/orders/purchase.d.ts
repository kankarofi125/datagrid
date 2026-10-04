import type { Network, ProviderId, ProviderPlan, PurchaseRequest, PurchaseResult, RouterConfig, StatusResult } from "../types.js";
import type { DataProviderAdapter } from "../providers/types.js";
import type { IdempotencyStore } from "./idempotency.js";
import { type NetworkRoutingTable } from "../pricing/popularRouting.js";
import { type PopularPlanDef } from "../catalog/popularPlans.js";
export declare class DataRouterEngine {
    private readonly adapters;
    private readonly cache;
    private readonly idempotency;
    private readonly config;
    constructor(config: RouterConfig, adapters: Map<ProviderId, DataProviderAdapter>, idempotency?: IdempotencyStore);
    /**
     * Disabled providers are ignored, including their fixture rows.
     * An omitted provider block does not get fixture rows, except Alrahuz,
     * which may still supply the ceiling when only its fixture catalog is set.
     */
    private includeProvider;
    refreshCatalogs(): Promise<Partial<Record<ProviderId, number>>>;
    private ensureCatalogs;
    quote(req: Omit<PurchaseRequest, "phone" | "idempotencyKey"> | {
        network: PurchaseRequest["network"];
        size: string | number;
        validityDays: number;
        productType: PurchaseRequest["productType"];
        preferProvider?: ProviderId;
    }): Promise<import("../types.js").QuoteResult>;
    purchase(req: PurchaseRequest): Promise<PurchaseResult>;
    getStatus(providerId: ProviderId, providerRef: string): Promise<StatusResult>;
    /** Static popular-plan catalog (optionally filter by network / etisalat alias). */
    listPopularPlans(network?: string | Network): PopularPlanDef[];
    /** Popular plan matrix for HTTP / dashboards (no live routing). */
    getPopularPlansMatrix(network?: string | Network): {
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
    /**
     * For each popular plan, pick the cheapest eligible provider.
     * When Alrahuz has no SKU, picks absolute cheapest and sets alrahuzBaselineMissing.
     */
    routePopularPlans(options?: {
        network?: string | Network;
    }): Promise<NetworkRoutingTable>;
    /** Alias for routePopularPlans — network → popular plan → cheapest provider. */
    buildNetworkRoutingTable(options?: {
        network?: string | Network;
    }): Promise<NetworkRoutingTable>;
    /** Test helper: replace catalog for a provider. */
    seedCatalog(providerId: ProviderId, plans: ProviderPlan[]): void;
}
//# sourceMappingURL=purchase.d.ts.map