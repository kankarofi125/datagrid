export class CatalogCache {
    ttlMs;
    store = new Map();
    constructor(ttlMs = 5 * 60 * 1000) {
        this.ttlMs = ttlMs;
    }
    get(providerId) {
        const entry = this.store.get(providerId);
        if (!entry)
            return null;
        if (Date.now() - entry.fetchedAt > this.ttlMs) {
            this.store.delete(providerId);
            return null;
        }
        return entry.plans;
    }
    set(providerId, plans) {
        this.store.set(providerId, { plans, fetchedAt: Date.now() });
    }
    clear(providerId) {
        if (providerId)
            this.store.delete(providerId);
        else
            this.store.clear();
    }
    /** Force-set without TTL check (tests / fixtures). */
    seed(providerId, plans) {
        this.set(providerId, plans);
    }
}
//# sourceMappingURL=cache.js.map