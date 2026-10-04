/**
 * Ordered-failover router for airtime + bills.
 *
 * Unlike DATA there is no catalog price matching here: airtime/electricity
 * are face-value products, cable/exam pins resolve their variation at the
 * adapter. The router guarantees at-most-once execution per idempotency key
 * and never fails over after an ambiguous outcome.
 */
import { BillsRouterError } from "./types.js";
import { buildBillsRegistry, billsFailoverOrder } from "./registry.js";
import { MemoryBillsIdempotencyStore } from "./idempotency.js";
/** Reservation horizon for in-flight keys (must exceed the slowest chain). */
const PURCHASE_LEASE_MS = 10 * 60 * 1000;
export class BillsRouterEngine {
    adapters;
    idempotency;
    config;
    constructor(config, adapters, idempotency) {
        this.config = config;
        this.adapters = adapters ?? buildBillsRegistry(config);
        this.idempotency = idempotency ?? new MemoryBillsIdempotencyStore();
    }
    eligible(domain) {
        const out = [];
        for (const id of billsFailoverOrder(this.config, this.adapters)) {
            const adapter = this.adapters.get(id);
            if (adapter && adapter.domains.includes(domain))
                out.push(adapter);
        }
        return out;
    }
    async reserve(key) {
        if (!key.trim()) {
            throw new BillsRouterError("idempotencyKey is required", "IDEMPOTENCY_REQUIRED");
        }
        const existing = await this.idempotency.get(key);
        if (existing) {
            const isPlaceholder = existing.status === "pending" && existing.message === "purchase_in_progress";
            const leaseAge = Date.now() - (existing.reservedAt ?? 0);
            if (!isPlaceholder || leaseAge < PURCHASE_LEASE_MS) {
                return { held: false, outcome: { ...existing, idempotentReplay: true }, inFlight: false };
            }
            await this.idempotency.delete(key);
        }
        const reserved = await this.idempotency.setIfAbsent(key, {
            ok: false,
            status: "pending",
            message: "purchase_in_progress",
            reservedAt: Date.now(),
        });
        if (!reserved) {
            const current = await this.idempotency.get(key);
            if (current && current.message !== "purchase_in_progress") {
                return { held: false, outcome: { ...current, idempotentReplay: true }, inFlight: false };
            }
            return { held: false, outcome: null, inFlight: true };
        }
        return { held: true };
    }
    async buy(domain, idempotencyKey, attempt, priceOf) {
        const gated = await this.reserve(idempotencyKey);
        if (!gated.held) {
            if (gated.outcome)
                return gated.outcome;
            return {
                ok: false,
                status: "pending",
                message: "purchase_in_progress",
                idempotentReplay: true,
                attempts: [],
            };
        }
        const adapters = this.eligible(domain);
        if (adapters.length === 0) {
            await this.idempotency.delete(idempotencyKey);
            return {
                ok: false,
                status: "failed",
                message: `No provider serves ${domain}`,
                attempts: [],
            };
        }
        const attempts = [];
        for (const adapter of adapters) {
            let res;
            try {
                res = await attempt(adapter);
            }
            catch (err) {
                res = {
                    ok: false,
                    status: "failed",
                    message: err instanceof Error ? err.message : String(err),
                };
            }
            attempts.push({
                providerId: adapter.id,
                ok: res.ok,
                status: res.status,
                message: res.message,
                providerRef: res.providerRef,
            });
            if (res.ambiguous) {
                const result = {
                    ok: false,
                    providerId: adapter.id,
                    providerRef: res.providerRef,
                    status: "pending",
                    priceNgn: priceOf(res),
                    token: res.token,
                    pins: res.pins,
                    customerName: res.customerName,
                    message: res.message ?? "Ambiguous provider outcome — requery before retrying",
                    attempts,
                };
                await this.idempotency.set(idempotencyKey, result);
                return result;
            }
            if (res.ok && (res.status === "success" || res.status === "pending")) {
                const result = {
                    ok: true,
                    providerId: adapter.id,
                    providerRef: res.providerRef,
                    status: res.status,
                    priceNgn: priceOf(res),
                    token: res.token,
                    pins: res.pins,
                    customerName: res.customerName,
                    message: res.message,
                    attempts,
                };
                await this.idempotency.set(idempotencyKey, result);
                return result;
            }
            // Definitive failure — fail over.
        }
        await this.idempotency.delete(idempotencyKey);
        const firstMessage = attempts[0]?.message;
        return {
            ok: false,
            status: "failed",
            message: firstMessage
                ? `All ${domain} providers failed — ${firstMessage}`
                : `All ${domain} providers failed`,
            attempts,
        };
    }
    async validate(domain, attempt) {
        let last = {
            ok: false,
            status: "failed",
            message: `No provider serves ${domain} validation`,
        };
        for (const adapter of this.eligible(domain)) {
            try {
                const res = await attempt(adapter);
                if (res.ok)
                    return res;
                last = res;
            }
            catch (err) {
                last = {
                    ok: false,
                    status: "failed",
                    message: err instanceof Error ? err.message : String(err),
                };
            }
        }
        return last;
    }
    async buyAirtime(a) {
        if (!a.phone?.trim()) {
            throw new BillsRouterError("phone is required", "PHONE_REQUIRED");
        }
        return this.buy("airtime", a.idempotencyKey, (ad) => ad.buyAirtime(a), (res) => res.priceNgn ?? a.amount);
    }
    async validateMeter(v) {
        return this.validate("electricity", (ad) => ad.validateMeter(v));
    }
    async buyElectricity(a) {
        return this.buy("electricity", a.idempotencyKey, (ad) => ad.buyElectricity(a), (res) => res.priceNgn ?? a.amount);
    }
    async validateIUC(v) {
        return this.validate("cable", (ad) => ad.validateIUC(v));
    }
    async buyCable(a) {
        return this.buy("cable", a.idempotencyKey, (ad) => ad.buyCable(a), (res) => res.priceNgn ?? a.amount);
    }
    async buyExamPin(a) {
        return this.buy("exampin", a.idempotencyKey, (ad) => ad.buyExamPin(a), (res) => res.priceNgn ?? a.amount);
    }
    async getStatus(providerId, providerRef) {
        const adapter = this.adapters.get(providerId);
        if (!adapter) {
            throw new BillsRouterError(`Provider not configured: ${providerId}`, "PROVIDER_NOT_CONFIGURED");
        }
        return adapter.getStatus(providerRef);
    }
}
export function createBillsRouter(config, opts) {
    const engine = new BillsRouterEngine(config, undefined, opts?.idempotency);
    return {
        buyAirtime: (a) => engine.buyAirtime(a),
        validateMeter: (v) => engine.validateMeter(v),
        buyElectricity: (a) => engine.buyElectricity(a),
        validateIUC: (v) => engine.validateIUC(v),
        buyCable: (a) => engine.buyCable(a),
        buyExamPin: (a) => engine.buyExamPin(a),
        getStatus: (id, ref) => engine.getStatus(id, ref),
        engine,
    };
}
//# sourceMappingURL=router.js.map