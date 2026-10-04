/**
 * Shared MSORG-style HTTP client.
 *
 * Many Nigerian VTU dashboards (Alrahuz, Gladtidings, etc.) are built on the
 * MSORG / similar white-label stack. Public endpoint docs are weak; the paths
 * below are the commonly observed conventions (also noted by Ogdams as
 * portable across Msorg/SmePlug-style bases). Override via config if your
 * dashboard exposes different routes.
 *
 * Alrahuz paths confirmed from
 * https://documenter.getpostman.com/view/18957639/2s9YR6buRK
 * and a logged-in GET /api/user/ on 2026-09-25:
 *   GET  /api/user/          catalog (Dataplans), plus wallet metadata
 *   POST /api/data/          buy {network, mobile_number, plan, Ported_number}
 *   GET  /api/data/          transaction list, not the catalog
 *   GET  /api/data/<id>      requery one transaction
 * Auth: Authorization: Token <apiToken>
 *
 * Alrahuz network ids (documentation page + plan.network):
 *   MTN 1, Glo 2, 9mobile 3, Airtel 4. Set on the Alrahuz adapter.
 * The default map below is the older clone order and is NOT Alrahuz.
 *
 * Semz still has no live host. These paths are only a template for it.
 */
import type { Network, ProductType, ProviderConfigBase, ProviderId, ProviderPlan, StatusResult } from "../types.js";
import type { DataProviderAdapter, PurchaseAdapterResult } from "./types.js";
export interface MsorgClientOptions extends ProviderConfigBase {
    providerId: ProviderId;
    fetchFn?: typeof fetch;
}
/**
 * Shared defaults. Alrahuz and Gladtidings factories override list/status
 * to the documented /api/user/ and /api/data/{ref} paths.
 */
export declare const MSORG_DEFAULT_PATHS: {
    readonly listPlans: "/api/user/";
    readonly purchase: "/api/data/";
    readonly status: "/api/data/{ref}";
};
/** Older clone order. Alrahuz does not use this. See ALRAHUZ_NETWORK_IDS. */
export declare const MSORG_LEGACY_NETWORK_IDS: Record<Network, number>;
/** Alrahuz writes "1000.0MB" for a 1GB bundle. Quotes use 1024 for 1GB. */
export declare function snapVtuThousands(sizeMb: number, raw: string): number;
/**
 * Prefer plan_type. Gladtidings repeats one Airtel list under CORPORATE, SME,
 * and GIFTING, so the bucket name would mark a GIFTING row as CG.
 * An unrecognized plan_type (DATA SHARE, DATA COUPONS, SPECIAL) stays unknown
 * instead of inheriting the bucket.
 */
export declare function productFromMsorg(bucket: string, planType: string): ProductType;
export declare class MsorgClient implements DataProviderAdapter {
    readonly id: ProviderId;
    private readonly baseUrl;
    private readonly apiToken?;
    private readonly timeoutMs;
    private readonly fetchFn;
    private readonly paths;
    private readonly authScheme;
    private readonly networkIds;
    constructor(opts: MsorgClientOptions);
    private headers;
    private request;
    listPlans(): Promise<ProviderPlan[]>;
    parsePlans(body: unknown): ProviderPlan[];
    private rowToPlan;
    purchase(args: {
        planCode: string;
        phone: string;
        network: string;
        productType: string;
        idempotencyKey: string;
    }): Promise<PurchaseAdapterResult>;
    mapPurchaseResponse(httpStatus: number, body: unknown): PurchaseAdapterResult;
    getStatus(providerRef: string): Promise<StatusResult>;
}
//# sourceMappingURL=msorg.d.ts.map