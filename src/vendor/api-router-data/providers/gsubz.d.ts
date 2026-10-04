/**
 * Gsubz data adapter.
 *
 * Documented (re-read 2026-09-25): https://web.gsubz.com/api_doc/
 *   GET  https://api.gsubz.com/api/plans/?service=<serviceID>
 *        Public. No auth required to list. A bearer key, when set, is still
 *        sent so an upgraded account can receive its own api_price.
 *   POST https://api.gsubz.com/api/pay/
 *        Authorization: Bearer <api_key>
 *        The same key is also the form field `api`.
 *        Docs show both multipart --form and x-www-form-urlencoded.
 *        This client sends urlencoded.
 *   POST https://api.gsubz.com/api/verify/
 *        Form fields requestID + api. This is the status requery.
 *
 * Live unauthenticated plans (2026-09-25) use `PlanName` of either `plan`
 * or `plan_id` depending on the service. The purchase body field is whatever
 * PlanName says, not a hardcoded `plan`.
 * planCode is `${service}|${planField}|${value}` because the same value
 * (for example 166) appears on more than one service.
 *
 * Price: the public payload has both `price` (retail) and `api_price`
 * (published API tier, plus a `discount` string). Wallet routing uses
 * api_price when it is present. That figure is still not a logged-in quote;
 * the docs say accounts are moved to cheaper pricing after integration.
 *
 * Services probed the same day that returned
 * {"error":"Service not found or inactive"}: mtn_cg, mtn_sme2, mtn_corporate,
 * glo_cg, airtel_cg, 9mobile, 9mobile_sme. They are not in the default list.
 */
import type { ProviderConfigBase, ProviderPlan, StatusResult } from "../types.js";
import type { DataProviderAdapter, PurchaseAdapterResult } from "./types.js";
export declare const GSUBZ_DEFAULT_SERVICES: readonly ["mtn_sme", "mtn_gifting", "glo_data", "glo_sme", "airtel_sme", "etisalat_data"];
export declare function gsubzPlanCode(service: string, planField: string, value: string): string;
export declare function splitGsubzPlanCode(planCode: string): {
    service: string;
    planField: string;
    value: string;
} | null;
export declare function parseGsubzServicePlans(service: string, body: unknown): ProviderPlan[];
export declare class GsubzAdapter implements DataProviderAdapter {
    readonly id: "gsubz";
    private readonly baseUrl;
    private readonly apiKey?;
    private readonly timeoutMs;
    private readonly fetchFn;
    private readonly services;
    private readonly plansPath;
    private readonly payPath;
    private readonly verifyPath;
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
export declare function mapGsubzPurchase(httpStatus: number, body: unknown, requestId: string): PurchaseAdapterResult;
export declare function createGsubzAdapter(config: ProviderConfigBase, fetchFn?: typeof fetch): GsubzAdapter;
//# sourceMappingURL=gsubz.d.ts.map