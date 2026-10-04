/**
 * DataGifting REST adapter.
 * Docs: https://v6.datagifting.com.ng/web/APIDocs.php
 *
 *   GET /web/api/data-plans.php?api_key=
 *   GET /web/api/data.php?api_key=&type=&network=&quantity=&phone_no=
 *   GET /web/api/requery.php?api_key=&reference=
 *
 * type: sme-data | shared-data | cg-data | dd-data
 */
import type { ProductType, ProviderConfigBase, ProviderPlan, StatusResult } from "../types.js";
import type { DataProviderAdapter, PurchaseAdapterResult } from "./types.js";
export declare class DataGiftingAdapter implements DataProviderAdapter {
    readonly id: "datagifting";
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeoutMs;
    private readonly fetchFn;
    constructor(config: ProviderConfigBase, fetchFn?: typeof fetch);
    private get;
    listPlans(): Promise<ProviderPlan[]>;
    parsePlans(body: unknown): ProviderPlan[];
    purchase(args: {
        planCode: string;
        phone: string;
        network: string;
        productType: ProductType;
        idempotencyKey: string;
    }): Promise<PurchaseAdapterResult>;
    getStatus(providerRef: string): Promise<StatusResult>;
}
export declare function createDataGiftingAdapter(config: ProviderConfigBase, fetchFn?: typeof fetch): DataGiftingAdapter;
//# sourceMappingURL=datagifting.d.ts.map