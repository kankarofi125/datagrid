/**
 * Easy Access API adapter (easyaccessapi.com.ng / easyaccess.com.ng).
 *
 * Probed 2026-09-25 with no token (Accept: application/json):
 *   GET /api/data          → 404 "The route api/data could not be found."
 *   GET /api/requery       → 404
 *   GET /variation-codes   → 401 {"message":"Unauthenticated."}
 *   POST-or-GET /buydata   → 401 {"message":"Unauthenticated."}
 *   GET /data-receipt/{id} → 401 {"message":"Unauthenticated."}
 *   GET /documentation     → 401 (the real docs are behind login)
 *
 * Route *existence* of /variation-codes, /buydata, and /data-receipt/{id}
 * is confirmed. Request and response *shapes* are not — do not treat the
 * JSON body this adapter sends as official. Override config.paths after
 * reading the logged-in documentation.
 *
 * Auth default is Bearer. The app exposes sanctum/csrf-cookie and returns
 * Laravel's "Unauthenticated." JSON, which matches Sanctum bearer tokens.
 * Set authScheme: "token" if your dashboard still says `Token <key>`.
 */
import type { ProviderConfigBase, ProviderPlan, StatusResult } from "../types.js";
import type { DataProviderAdapter, PurchaseAdapterResult } from "./types.js";
/** Routes that answered 401 (exist) rather than 404 on 2026-09-25. */
export declare const EASYACCESS_DEFAULT_PATHS: {
    readonly listPlans: "/variation-codes";
    readonly purchase: "/buydata";
    readonly status: "/data-receipt/{ref}";
};
export declare class EasyAccessAdapter implements DataProviderAdapter {
    readonly id: "easyaccess";
    private readonly baseUrl;
    private readonly apiToken?;
    private readonly timeoutMs;
    private readonly fetchFn;
    private readonly paths;
    private readonly authScheme;
    constructor(config: ProviderConfigBase, fetchFn?: typeof fetch);
    private headers;
    private request;
    listPlans(): Promise<ProviderPlan[]>;
    parsePlans(body: unknown): ProviderPlan[];
    purchase(args: {
        planCode: string;
        phone: string;
        network: string;
        productType: string;
        idempotencyKey: string;
    }): Promise<PurchaseAdapterResult>;
    getStatus(providerRef: string): Promise<StatusResult>;
}
export declare function createEasyAccessAdapter(config: ProviderConfigBase, fetchFn?: typeof fetch): EasyAccessAdapter;
//# sourceMappingURL=easyaccess.d.ts.map