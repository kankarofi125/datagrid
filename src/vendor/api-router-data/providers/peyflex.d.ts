/**
 * Peyflex data adapter.
 *
 * Documented data endpoints (not only airtime), confirmed two ways on
 * 2026-09-25:
 *   Postman collection headings include Data → Query Data Networks,
 *   Query Data Plans, Data Purchase:
 *   https://documenter.getpostman.com/view/17835214/2sB34imLMn
 *   The public PHP client encodes the same paths:
 *   https://github.com/henryejemuta/php-peyflex-vtu/blob/main/src/Client.php
 *
 *   Base: https://client.peyflex.com.ng/api/
 *   Auth: Authorization: Token <dashboard token>
 *   GET  data/networks
 *   GET  data/plans?network=<network id>
 *   POST data/purchase
 *        JSON { network, mobile_number, plan_code }
 *
 * A status/requery route is NOT in that PHP client and was not in the
 * Postman section list reviewed (profile, airtime, data, cable, electricity,
 * recharge card, betting, education, virtual number). getStatus does not
 * call a guessed URL. Set providers.peyflex.paths.status (use `{ref}`)
 * after reading the logged-in collection.
 *
 * Authenticated GET on 2026-10-04 (Token header, base URL ending in /api):
 *   GET data/networks/ → { networks: [{ name, identifier }] }
 *   GET data/plans/?network=<identifier> → { plans: [{ plan_code, amount, label }] }
 * The duration is inside label ("1GB = N395 (30 DAYS)"), not a validity field.
 * identifier values seen: mtn_gifting_data, glo_data, 9mobile_data,
 * airtel_data, mtn_data_share. Data Share stays productType unknown.
 *
 * The marketing table at https://peyflex.com.ng/data-pricing/ has no
 * product type and no validity. It is not loaded as a catalog.
 */
import type { ProviderConfigBase, ProviderPlan, StatusResult } from "../types.js";
import type { DataProviderAdapter, PurchaseAdapterResult } from "./types.js";
export declare function peyflexPlanCode(networkId: string, planCode: string): string;
export declare function splitPeyflexPlanCode(planCode: string): {
    networkId: string;
    code: string;
} | null;
export declare function parsePeyflexPlans(body: unknown, networkFallback: string, networkTitle?: string): ProviderPlan[];
export declare class PeyflexAdapter implements DataProviderAdapter {
    readonly id: "peyflex";
    private readonly baseUrl;
    private readonly apiToken?;
    private readonly timeoutMs;
    private readonly fetchFn;
    private readonly networksPath;
    private readonly plansPath;
    private readonly purchasePath;
    private readonly statusPath?;
    constructor(config: ProviderConfigBase, fetchFn?: typeof fetch);
    private headers;
    private request;
    listPlans(): Promise<ProviderPlan[]>;
    purchase(args: {
        planCode: string;
        phone: string;
        idempotencyKey: string;
    }): Promise<PurchaseAdapterResult>;
    getStatus(providerRef: string): Promise<StatusResult>;
}
export declare function createPeyflexAdapter(config: ProviderConfigBase, fetchFn?: typeof fetch): PeyflexAdapter;
//# sourceMappingURL=peyflex.d.ts.map