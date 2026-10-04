/**
 * Shared domain types for the VTU data routing engine.
 */
export type Network = "mtn" | "airtel" | "glo" | "9mobile";
export type ProductType = "sme" | "cg" | "sme2" | "gifting" | "direct" | "unknown";
export type ProviderId = "alrahuz" | "gladtidings" | "easyaccess" | "datagifting" | "gsubz" | "semz" | "peyflex";
export type OrderStatus = "success" | "pending" | "failed" | "unknown";
/** Normalized plan identity used for price comparison and routing. */
export interface NormalizedPlanKey {
    network: Network;
    /** Size in megabytes (1024 = 1GB). */
    sizeMb: number;
    validityDays: number;
    productType: ProductType;
}
export interface ProviderPlan {
    providerId: ProviderId;
    /** Provider-native plan/product code. */
    planCode: string;
    network: Network;
    sizeMb: number;
    validityDays: number;
    productType: ProductType;
    /** Wallet debit price in Naira. */
    priceNgn: number;
    /** Optional human label from provider catalog. */
    label?: string;
    raw?: unknown;
    /**
     * True when this row is a unit-test or dated research snapshot.
     * Never treat it as a live wallet quote.
     */
    fixtureOnly?: boolean;
}
export interface QuoteRequest {
    network: Network;
    /** Size string or MB number, e.g. "1GB", "500MB", 1024. */
    size: string | number;
    validityDays: number;
    productType: ProductType;
    phone?: string;
}
export interface QuoteCandidate {
    providerId: ProviderId;
    planCode: string;
    priceNgn: number;
    eligible: boolean;
    reason?: string;
}
export interface QuoteResult {
    plan: NormalizedPlanKey;
    baselinePriceNgn: number | null;
    selected: QuoteCandidate | null;
    candidates: QuoteCandidate[];
    error?: string;
}
export interface PurchaseRequest extends QuoteRequest {
    phone: string;
    /** Client idempotency key — same key returns same order outcome. */
    idempotencyKey: string;
    /** Force a specific provider (still must be ≤ baseline). */
    preferProvider?: ProviderId;
}
export interface PurchaseResult {
    ok: boolean;
    providerId?: ProviderId;
    providerRef?: string;
    status: OrderStatus;
    priceNgn?: number;
    planCode?: string;
    message?: string;
    attempts?: Array<{
        providerId: ProviderId;
        ok: boolean;
        status: OrderStatus;
        message?: string;
        providerRef?: string;
    }>;
    /** True when served from idempotency store. */
    idempotentReplay?: boolean;
    /** Internal: when an in-progress reservation was placed (lease checks). */
    reservedAt?: number;
}
export interface StatusResult {
    providerId: ProviderId;
    providerRef: string;
    status: OrderStatus;
    message?: string;
    raw?: unknown;
}
/**
 * Override adapter HTTP paths. Each adapter documents which defaults are
 * confirmed vs assumed. `{ref}` in `status` is replaced with the provider ref.
 */
export interface ProviderEndpointPaths {
    listPlans?: string;
    purchase?: string;
    status?: string;
}
export type AuthScheme = "bearer" | "token" | "raw";
export interface ProviderConfigBase {
    enabled: boolean;
    baseUrl: string;
    /** Auth token / API key / username:password depending on adapter. */
    apiToken?: string;
    apiKey?: string;
    username?: string;
    password?: string;
    timeoutMs?: number;
    /** Per-provider path overrides. Omitted keys keep the adapter default. */
    paths?: ProviderEndpointPaths;
    /**
     * Authorization scheme. Easy Access defaults to bearer (Laravel Sanctum).
     * MSORG defaults to token. Gsubz defaults to bearer.
     */
    authScheme?: AuthScheme;
    /** Gsubz service IDs to list. Ignored by other adapters. */
    services?: string[];
    /**
     * Purchase `network` ids. Alrahuz's logged-in documentation (2026-09-25)
     * is MTN 1, Glo 2, 9mobile 3, Airtel 4. Other MSORG sites may differ.
     */
    networkIds?: Partial<Record<Network, number>>;
}
export interface RouterConfig {
    providers: {
        alrahuz?: ProviderConfigBase;
        gladtidings?: ProviderConfigBase;
        easyaccess?: ProviderConfigBase;
        datagifting?: ProviderConfigBase;
        gsubz?: ProviderConfigBase;
        semz?: ProviderConfigBase;
        peyflex?: ProviderConfigBase;
    };
    /** Override fetch for tests. */
    fetchFn?: typeof fetch;
    /** Catalog TTL in ms (default 5 minutes). */
    catalogTtlMs?: number;
    /** Optional static fixture catalogs keyed by provider (for tests / offline). */
    fixtureCatalogs?: Partial<Record<ProviderId, ProviderPlan[]>>;
    /** Skip live catalog fetch when fixtures are present. */
    useFixturesOnly?: boolean;
}
export declare class RouterError extends Error {
    readonly code: string;
    readonly details?: unknown | undefined;
    constructor(message: string, code: string, details?: unknown | undefined);
}
//# sourceMappingURL=types.d.ts.map