import { RouterError } from "../types.js";
import { toNormalizedKey } from "../catalog/normalize.js";
import { CatalogCache } from "../catalog/cache.js";
import { failoverOrder, selectRoute, toQuoteResult, } from "../pricing/router.js";
import { MemoryIdempotencyStore } from "./idempotency.js";
import { buildNetworkRoutingTable, popularPlansMatrix, routePopularPlans, } from "../pricing/popularRouting.js";
import { listPopularPlans, } from "../catalog/popularPlans.js";
/**
 * How long an in-progress idempotency reservation is honored before another
 * caller may take over (crash recovery). Generous: must exceed the slowest
 * provider timeout chain (failoverOrder × timeoutMs).
 */
const PURCHASE_LEASE_MS = 10 * 60 * 1000;
export class DataRouterEngine {
    adapters;
    cache;
    idempotency;
    config;
    constructor(config, adapters, idempotency) {
        this.config = config;
        this.adapters = adapters;
        this.cache = new CatalogCache(config.catalogTtlMs ?? 5 * 60 * 1000);
        this.idempotency = idempotency ?? new MemoryIdempotencyStore();
        if (config.fixtureCatalogs) {
            for (const [id, plans] of Object.entries(config.fixtureCatalogs)) {
                const pid = id;
                if (plans && this.includeProvider(pid))
                    this.cache.seed(pid, plans);
            }
        }
    }
    /**
     * Disabled providers are ignored, including their fixture rows.
     * An omitted provider block does not get fixture rows, except Alrahuz,
     * which may still supply the ceiling when only its fixture catalog is set.
     */
    includeProvider(id) {
        const cfg = this.config.providers[id];
        if (!cfg)
            return id === "alrahuz";
        return cfg.enabled === true;
    }
    async refreshCatalogs() {
        const counts = {};
        if (this.config.useFixturesOnly) {
            for (const id of this.adapters.keys()) {
                const cached = this.cache.get(id);
                counts[id] = cached?.length ?? 0;
            }
            return counts;
        }
        const refreshErrors = [];
        await Promise.all([...this.adapters.entries()].map(async ([id, adapter]) => {
            try {
                const plans = await adapter.listPlans();
                this.cache.set(id, plans);
                counts[id] = plans.length;
            }
            catch (err) {
                // Keep stale cache if present
                const stale = this.cache.get(id);
                if (stale) {
                    this.cache.set(id, stale);
                    counts[id] = stale.length;
                }
                else if (this.config.fixtureCatalogs?.[id]) {
                    this.cache.seed(id, this.config.fixtureCatalogs[id]);
                    counts[id] = this.config.fixtureCatalogs[id].length;
                }
                else {
                    // Isolate the failure to this provider — other providers'
                    // refreshes must still land.
                    refreshErrors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
                    counts[id] = 0;
                }
            }
        }));
        if (refreshErrors.length > 0) {
            const succeeded = Object.values(counts).some((c) => c > 0);
            if (!succeeded) {
                throw new RouterError(`Failed to refresh catalogs: ${refreshErrors.join("; ")}`, "CATALOG_REFRESH_FAILED", { providers: refreshErrors });
            }
            // Partial refresh: healthy providers are usable; the caller sees
            // zero counts for the failed ones.
        }
        return counts;
    }
    async ensureCatalogs() {
        const out = new Map();
        const missing = [];
        for (const id of this.adapters.keys()) {
            const cached = this.cache.get(id);
            if (cached)
                out.set(id, cached);
            else
                missing.push(id);
        }
        // Also include fixture-only providers not in adapters (tests)
        if (this.config.fixtureCatalogs) {
            for (const [id, plans] of Object.entries(this.config.fixtureCatalogs)) {
                const pid = id;
                if (!out.has(pid) && plans && this.includeProvider(pid)) {
                    this.cache.seed(pid, plans);
                    out.set(pid, plans);
                }
            }
        }
        if (missing.length && !this.config.useFixturesOnly) {
            await this.refreshCatalogs();
            for (const id of this.adapters.keys()) {
                const cached = this.cache.get(id);
                if (cached)
                    out.set(id, cached);
            }
        }
        // Ensure Alrahuz fixture is visible even if adapter disabled but fixtures set
        if (this.config.fixtureCatalogs?.alrahuz &&
            !out.has("alrahuz") &&
            this.includeProvider("alrahuz")) {
            out.set("alrahuz", this.config.fixtureCatalogs.alrahuz);
        }
        return out;
    }
    async quote(req) {
        const plan = toNormalizedKey(req.network, req.size, req.validityDays, req.productType);
        const catalogs = await this.ensureCatalogs();
        const selection = selectRoute(plan, catalogs, {
            preferProvider: "preferProvider" in req ? req.preferProvider : undefined,
        });
        return toQuoteResult(selection);
    }
    async purchase(req) {
        if (!req.idempotencyKey?.trim()) {
            throw new RouterError("idempotencyKey is required", "IDEMPOTENCY_REQUIRED");
        }
        if (!req.phone?.trim()) {
            throw new RouterError("phone is required", "PHONE_REQUIRED");
        }
        const existing = await this.idempotency.get(req.idempotencyKey);
        if (existing) {
            // A crashed run may leave a stale in-progress reservation. Reacquire
            // the lease if it has expired (PURCHASE_LEASE_MS); never touch a
            // completed outcome.
            const isPlaceholder = existing.status === "pending" &&
                existing.message === "purchase_in_progress";
            const leaseAge = Date.now() - (existing.reservedAt ?? 0);
            if (!isPlaceholder || leaseAge < PURCHASE_LEASE_MS) {
                return { ...existing, idempotentReplay: true };
            }
            await this.idempotency.delete(req.idempotencyKey);
        }
        // Reserve the idempotency key before any side effects. If reservation
        // succeeds, only this call may complete the purchase for this key.
        const reserved = await this.idempotency.setIfAbsent(req.idempotencyKey, {
            ok: false,
            status: "pending",
            message: "purchase_in_progress",
            reservedAt: Date.now(),
        });
        if (!reserved) {
            // A concurrent request holds the key — never double-buy. Re-read the
            // outcome; if it hasn't landed yet, tell the caller to retry/requery.
            const current = await this.idempotency.get(req.idempotencyKey);
            if (current && current.message !== "purchase_in_progress") {
                return { ...current, idempotentReplay: true };
            }
            return {
                ok: false,
                status: "pending",
                message: "purchase_in_progress",
                idempotentReplay: true,
                attempts: [],
            };
        }
        const plan = toNormalizedKey(req.network, req.size, req.validityDays, req.productType);
        const catalogs = await this.ensureCatalogs();
        const selection = selectRoute(plan, catalogs, {
            preferProvider: req.preferProvider,
        });
        if (!selection.selected) {
            // No purchase attempted — release reservation; caller may retry the
            // same key later (e.g. after catalogs refresh).
            await this.idempotency.delete(req.idempotencyKey);
            return {
                ok: false,
                status: "failed",
                message: selection.error ?? "No eligible provider",
                attempts: [],
            };
        }
        const order = failoverOrder(selection);
        const attempts = [];
        for (const candidate of order) {
            const adapter = this.adapters.get(candidate.providerId);
            if (!adapter) {
                attempts.push({
                    providerId: candidate.providerId,
                    ok: false,
                    status: "failed",
                    message: "adapter_not_configured",
                });
                continue;
            }
            try {
                const res = await adapter.purchase({
                    planCode: candidate.planCode,
                    phone: req.phone,
                    network: req.network,
                    productType: req.productType,
                    idempotencyKey: req.idempotencyKey,
                    sizeMb: plan.sizeMb,
                    validityDays: plan.validityDays,
                });
                attempts.push({
                    providerId: candidate.providerId,
                    ok: res.ok,
                    status: res.status,
                    message: res.message,
                    providerRef: res.providerRef,
                });
                if (res.ambiguous) {
                    // The provider may have processed the purchase (timeout / 5xx after
                    // submit). DO NOT fail over — that risks a double purchase. Persist
                    // a pending outcome so replays of this key get the same answer and
                    // the caller can requery via getStatus().
                    const result = {
                        ok: false,
                        providerId: candidate.providerId,
                        providerRef: res.providerRef,
                        status: "pending",
                        priceNgn: candidate.priceNgn,
                        planCode: candidate.planCode,
                        message: res.message ??
                            "Ambiguous provider outcome — requery status before retrying",
                        attempts,
                    };
                    await this.idempotency.set(req.idempotencyKey, result);
                    return result;
                }
                if (res.ok && (res.status === "success" || res.status === "pending")) {
                    const result = {
                        ok: true,
                        providerId: candidate.providerId,
                        providerRef: res.providerRef,
                        status: res.status,
                        priceNgn: candidate.priceNgn,
                        planCode: candidate.planCode,
                        message: res.message,
                        attempts,
                    };
                    await this.idempotency.set(req.idempotencyKey, result);
                    return result;
                }
                // Definitive failure — failover to next candidate
            }
            catch (err) {
                const isAbort = err instanceof Error &&
                    (err.name === "AbortError" ||
                        err.name === "TimeoutError" ||
                        /abort|timeout/i.test(err.message));
                attempts.push({
                    providerId: candidate.providerId,
                    ok: false,
                    status: isAbort ? "pending" : "failed",
                    message: err instanceof Error ? err.message : String(err),
                });
                if (isAbort) {
                    // Request may have reached the provider before the timeout fired.
                    // Stop — failover here could buy the same data twice.
                    const result = {
                        ok: false,
                        providerId: candidate.providerId,
                        status: "pending",
                        priceNgn: candidate.priceNgn,
                        planCode: candidate.planCode,
                        message: "Request timed out — outcome unknown; requery status before retrying",
                        attempts,
                    };
                    await this.idempotency.set(req.idempotencyKey, result);
                    return result;
                }
            }
        }
        // All eligible providers definitively failed — nothing was purchased.
        // Release the reservation so the key can be retried after providers
        // recover; never persist a failure as the key's final outcome.
        await this.idempotency.delete(req.idempotencyKey);
        const result = {
            ok: false,
            status: "failed",
            message: "All eligible providers failed",
            attempts,
        };
        return result;
    }
    async getStatus(providerId, providerRef) {
        const adapter = this.adapters.get(providerId);
        if (!adapter) {
            throw new RouterError(`Provider not configured: ${providerId}`, "PROVIDER_NOT_CONFIGURED");
        }
        return adapter.getStatus(providerRef);
    }
    /** Static popular-plan catalog (optionally filter by network / etisalat alias). */
    listPopularPlans(network) {
        return listPopularPlans(network);
    }
    /** Popular plan matrix for HTTP / dashboards (no live routing). */
    getPopularPlansMatrix(network) {
        return popularPlansMatrix(network);
    }
    /**
     * For each popular plan, pick the cheapest eligible provider.
     * When Alrahuz has no SKU, picks absolute cheapest and sets alrahuzBaselineMissing.
     */
    async routePopularPlans(options) {
        const catalogs = await this.ensureCatalogs();
        return routePopularPlans(catalogs, options);
    }
    /** Alias for routePopularPlans — network → popular plan → cheapest provider. */
    async buildNetworkRoutingTable(options) {
        const catalogs = await this.ensureCatalogs();
        return buildNetworkRoutingTable(catalogs, options);
    }
    /** Test helper: replace catalog for a provider. */
    seedCatalog(providerId, plans) {
        this.cache.seed(providerId, plans);
    }
}
//# sourceMappingURL=purchase.js.map