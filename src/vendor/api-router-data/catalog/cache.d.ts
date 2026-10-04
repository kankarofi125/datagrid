import type { ProviderId, ProviderPlan } from "../types.js";
export declare class CatalogCache {
    private readonly ttlMs;
    private store;
    constructor(ttlMs?: number);
    get(providerId: ProviderId): ProviderPlan[] | null;
    set(providerId: ProviderId, plans: ProviderPlan[]): void;
    clear(providerId?: ProviderId): void;
    /** Force-set without TTL check (tests / fixtures). */
    seed(providerId: ProviderId, plans: ProviderPlan[]): void;
}
//# sourceMappingURL=cache.d.ts.map