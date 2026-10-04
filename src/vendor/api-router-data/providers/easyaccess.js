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
import { inferProductTypeFromLabel, normalizeNetwork, parseSizeToMb, parseValidityDays, } from "../catalog/normalize.js";
function joinUrl(base, path) {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
/** Routes that answered 401 (exist) rather than 404 on 2026-09-25. */
export const EASYACCESS_DEFAULT_PATHS = {
    listPlans: "/variation-codes",
    purchase: "/buydata",
    status: "/data-receipt/{ref}",
};
export class EasyAccessAdapter {
    id = "easyaccess";
    baseUrl;
    apiToken;
    timeoutMs;
    fetchFn;
    paths;
    authScheme;
    constructor(config, fetchFn) {
        this.baseUrl = config.baseUrl;
        this.apiToken = config.apiToken ?? config.apiKey;
        this.timeoutMs = config.timeoutMs ?? 30_000;
        this.fetchFn = fetchFn ?? fetch;
        this.paths = {
            listPlans: config.paths?.listPlans || EASYACCESS_DEFAULT_PATHS.listPlans,
            purchase: config.paths?.purchase || EASYACCESS_DEFAULT_PATHS.purchase,
            status: config.paths?.status || EASYACCESS_DEFAULT_PATHS.status,
        };
        this.authScheme = config.authScheme ?? "bearer";
    }
    headers() {
        const h = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };
        if (this.apiToken) {
            if (this.authScheme === "token")
                h.Authorization = `Token ${this.apiToken}`;
            else if (this.authScheme === "raw")
                h.Authorization = this.apiToken;
            else
                h.Authorization = `Bearer ${this.apiToken}`;
        }
        return h;
    }
    async request(path, init) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
        try {
            const res = await this.fetchFn(joinUrl(this.baseUrl, path), {
                ...init,
                headers: { ...this.headers(), ...init?.headers },
                signal: ctrl.signal,
            });
            const text = await res.text();
            let body = text;
            try {
                body = text ? JSON.parse(text) : null;
            }
            catch {
                /* keep */
            }
            return { status: res.status, body };
        }
        finally {
            clearTimeout(t);
        }
    }
    async listPlans() {
        const { status, body } = await this.request(this.paths.listPlans, {
            method: "GET",
        });
        if (status >= 400)
            throw new Error(`easyaccess catalog HTTP ${status}`);
        return this.parsePlans(body);
    }
    parsePlans(body) {
        const rows = Array.isArray(body)
            ? body
            : Array.isArray(body?.data)
                ? body.data
                : Array.isArray(body?.plans)
                    ? body.plans
                    : Array.isArray(body?.variations)
                        ? body.variations
                        : Array.isArray(body?.variation_codes)
                            ? body.variation_codes
                            : [];
        const out = [];
        for (const row of rows) {
            const r = row;
            const label = String(r.name ?? r.plan_name ?? r.plan ?? "");
            const planCode = String(r.plan_id ?? r.id ?? r.code ?? "");
            const price = Number(r.amount ?? r.price ?? r.plan_amount ?? NaN);
            if (!planCode || !Number.isFinite(price))
                continue;
            let network;
            try {
                network = normalizeNetwork(String(r.network ?? r.network_name ?? "mtn"));
            }
            catch {
                continue;
            }
            let sizeMb;
            try {
                sizeMb = parseSizeToMb(String(r.size ?? r.plan_size ?? r.volume ?? label));
            }
            catch {
                continue;
            }
            out.push({
                providerId: this.id,
                planCode,
                network,
                sizeMb,
                validityDays: parseValidityDays((r.validity ?? r.days ?? r.duration ?? 30)),
                productType: inferProductTypeFromLabel(String(r.type ?? r.plan_type ?? r.dataplan_type ?? label)),
                priceNgn: price,
                label: label || undefined,
                raw: row,
            });
        }
        return out;
    }
    async purchase(args) {
        // Body field names are NOT confirmed. /documentation returned 401 on
        // 2026-09-25. These keys match the previous conventional guess so a
        // logged-in doc can be diffed against one place. Path is overridable.
        const payload = {
            network: args.network,
            plan_id: args.planCode,
            phone: args.phone,
            mobile_number: args.phone,
            customer_ref: args.idempotencyKey,
        };
        const { status, body } = await this.request(this.paths.purchase, {
            method: "POST",
            body: JSON.stringify(payload),
        });
        const b = (body ?? {});
        const statusStr = String(b.status ?? b.Status ?? "").toLowerCase();
        const ref = String(b.order_id ?? b.reference ?? b.ref ?? b.ident ?? "");
        const message = String(b.message ?? b.msg ?? b.api_response ?? "");
        if (status >= 500) {
            return {
                ok: false,
                status: "failed",
                message: message || `HTTP ${status}`,
                raw: body,
                ambiguous: true,
            };
        }
        if (statusStr.includes("success") || statusStr === "true") {
            return { ok: true, status: "success", providerRef: ref || undefined, message, raw: body };
        }
        if (statusStr.includes("pend") || statusStr.includes("process")) {
            return { ok: true, status: "pending", providerRef: ref || undefined, message, raw: body };
        }
        if (status >= 400 || statusStr.includes("fail")) {
            return { ok: false, status: "failed", providerRef: ref || undefined, message, raw: body };
        }
        if (ref)
            return { ok: true, status: "pending", providerRef: ref, message, raw: body };
        return { ok: false, status: "unknown", message: message || "Unrecognized", raw: body };
    }
    async getStatus(providerRef) {
        const path = this.paths.status.replaceAll("{ref}", encodeURIComponent(providerRef));
        const { status, body } = await this.request(path, { method: "GET" });
        const b = (body ?? {});
        const statusStr = String(b.status ?? "").toLowerCase();
        let mapped = "unknown";
        if (statusStr.includes("success"))
            mapped = "success";
        else if (statusStr.includes("pend") || statusStr.includes("process"))
            mapped = "pending";
        else if (statusStr.includes("fail") || status >= 400)
            mapped = "failed";
        return {
            providerId: this.id,
            providerRef,
            status: mapped,
            message: String(b.message ?? ""),
            raw: body,
        };
    }
}
export function createEasyAccessAdapter(config, fetchFn) {
    return new EasyAccessAdapter(config, fetchFn);
}
//# sourceMappingURL=easyaccess.js.map