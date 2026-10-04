/**
 * Shared MSORG-style HTTP client.
 *
 * Many Nigerian VTU dashboards (Alrahuz, Gladtidings, etc.) are built on the
 * MSORG / similar white-label stack. Public endpoint docs are weak; the paths
 * below are the commonly observed conventions (also noted by Ogdams as
 * portable across Msorg/SmePlug-style bases). Override via config if your
 * dashboard exposes different routes.
 *
 * Alrahuz paths confirmed from
 * https://documenter.getpostman.com/view/18957639/2s9YR6buRK
 * and a logged-in GET /api/user/ on 2026-09-25:
 *   GET  /api/user/          catalog (Dataplans), plus wallet metadata
 *   POST /api/data/          buy {network, mobile_number, plan, Ported_number}
 *   GET  /api/data/          transaction list, not the catalog
 *   GET  /api/data/<id>      requery one transaction
 * Auth: Authorization: Token <apiToken>
 *
 * Alrahuz network ids (documentation page + plan.network):
 *   MTN 1, Glo 2, 9mobile 3, Airtel 4. Set on the Alrahuz adapter.
 * The default map below is the older clone order and is NOT Alrahuz.
 *
 * Semz still has no live host. These paths are only a template for it.
 */
import { inferProductTypeFromLabel, normalizeNetwork, parseSizeToMb, parseValidityDays, } from "../catalog/normalize.js";
/**
 * Shared defaults. Alrahuz and Gladtidings factories override list/status
 * to the documented /api/user/ and /api/data/{ref} paths.
 */
export const MSORG_DEFAULT_PATHS = {
    listPlans: "/api/user/",
    purchase: "/api/data/",
    status: "/api/data/{ref}",
};
/** Older clone order. Alrahuz does not use this. See ALRAHUZ_NETWORK_IDS. */
export const MSORG_LEGACY_NETWORK_IDS = {
    mtn: 1,
    airtel: 2,
    glo: 3,
    "9mobile": 4,
};
function joinUrl(base, path) {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
function coerceSizeMb(sizeRaw) {
    if (typeof sizeRaw === "number") {
        // Small integers are often GB units on MSORG (1, 2, 5); large = MB
        if (sizeRaw > 0 && sizeRaw < 100)
            return parseSizeToMb(`${sizeRaw}GB`);
        return Math.round(sizeRaw);
    }
    return parseSizeToMb(String(sizeRaw));
}
/** Alrahuz writes "1000.0MB" for a 1GB bundle. Quotes use 1024 for 1GB. */
export function snapVtuThousands(sizeMb, raw) {
    if (!/mb/i.test(raw))
        return sizeMb;
    if (sizeMb >= 1000 && sizeMb % 1000 === 0)
        return (sizeMb / 1000) * 1024;
    return sizeMb;
}
function classifyMsorgProduct(src) {
    const s = src.toLowerCase();
    if (!s.trim())
        return "unknown";
    if (/\bsme\s*2\b|\bsme2\b/.test(s))
        return "sme2";
    if (/\bsme\b/.test(s))
        return "sme";
    if (/corporate|\bc\.?\s*g\b|\bcg\b/.test(s))
        return "cg";
    if (/gift/.test(s))
        return "gifting";
    return inferProductTypeFromLabel(s);
}
/**
 * Prefer plan_type. Gladtidings repeats one Airtel list under CORPORATE, SME,
 * and GIFTING, so the bucket name would mark a GIFTING row as CG.
 * An unrecognized plan_type (DATA SHARE, DATA COUPONS, SPECIAL) stays unknown
 * instead of inheriting the bucket.
 */
export function productFromMsorg(bucket, planType) {
    if (planType.trim())
        return classifyMsorgProduct(planType);
    return classifyMsorgProduct(bucket);
}
function networkFromRaw(raw, ids) {
    const text = String(raw ?? "").trim();
    if (text && !/^\d+$/.test(text))
        return normalizeNetwork(text);
    const n = Number(text);
    for (const [name, id] of Object.entries(ids)) {
        if (id === n)
            return name;
    }
    return normalizeNetwork(text);
}
function dataplanRows(body) {
    if (!body || typeof body !== "object" || Array.isArray(body))
        return null;
    const grouped = body.Dataplans;
    if (!grouped || typeof grouped !== "object")
        return null;
    const out = [];
    for (const buckets of Object.values(grouped)) {
        if (!buckets || typeof buckets !== "object")
            continue;
        const entries = Object.entries(buckets).filter((pair) => Array.isArray(pair[1]));
        const typed = entries.filter(([bucket]) => bucket.toUpperCase() !== "ALL");
        // ALL is a duplicate on Alrahuz. Gladtidings Glo has no other bucket,
        // so that group's ALL list is the catalog.
        const source = typed.length > 0 ? typed : entries;
        for (const [bucket, rows] of source) {
            for (const row of rows) {
                if (row && typeof row === "object") {
                    out.push({ bucket, row: row });
                }
            }
        }
    }
    return out;
}
export class MsorgClient {
    id;
    baseUrl;
    apiToken;
    timeoutMs;
    fetchFn;
    paths;
    authScheme;
    networkIds;
    constructor(opts) {
        this.id = opts.providerId;
        this.baseUrl = opts.baseUrl;
        this.apiToken = opts.apiToken ?? opts.apiKey;
        this.timeoutMs = opts.timeoutMs ?? 30_000;
        this.fetchFn = opts.fetchFn ?? fetch;
        this.paths = {
            listPlans: opts.paths?.listPlans || MSORG_DEFAULT_PATHS.listPlans,
            purchase: opts.paths?.purchase || MSORG_DEFAULT_PATHS.purchase,
            status: opts.paths?.status || MSORG_DEFAULT_PATHS.status,
        };
        this.authScheme = opts.authScheme ?? "token";
        this.networkIds = { ...MSORG_LEGACY_NETWORK_IDS, ...opts.networkIds };
    }
    headers() {
        const h = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };
        if (this.apiToken) {
            if (this.authScheme === "bearer")
                h.Authorization = `Bearer ${this.apiToken}`;
            else if (this.authScheme === "raw")
                h.Authorization = this.apiToken;
            else
                h.Authorization = `Token ${this.apiToken}`;
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
                /* keep text */
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
        if (status >= 400) {
            throw new Error(`${this.id} catalog HTTP ${status}`);
        }
        return this.parsePlans(body);
    }
    parsePlans(body) {
        const grouped = dataplanRows(body);
        if (grouped) {
            const plans = [];
            const seen = new Set();
            for (const row of grouped) {
                const plan = this.rowToPlan(row.row, row.bucket);
                if (!plan || seen.has(plan.planCode))
                    continue;
                seen.add(plan.planCode);
                plans.push(plan);
            }
            return plans;
        }
        const rows = Array.isArray(body)
            ? body
            : Array.isArray(body?.results)
                ? body.results
                : Array.isArray(body?.data)
                    ? body.data
                    : [];
        const plans = [];
        for (const row of rows) {
            if (!row || typeof row !== "object")
                continue;
            const plan = this.rowToPlan(row, "");
            if (plan)
                plans.push(plan);
        }
        return plans;
    }
    rowToPlan(r, bucket) {
        const label = String(r.plan ?? r.name ?? r.dataplan ?? "");
        const planTypeRaw = String(r.plan_type ?? r.type ?? bucket ?? label);
        const networkRaw = r.plan_network ?? r.network_name ?? r.network ?? r.network_id;
        const sizeRaw = r.plan_size ?? r.size ?? r.data_size ?? r.volume ?? label;
        const validityRaw = r.month_validate ?? r.validity ?? r.days ?? r.duration ?? 30;
        const price = Number(r.plan_amount ?? r.amount ?? r.price ?? r.selling_price ?? NaN);
        const planCode = String(r.dataplan_id ?? r.id ?? r.plan_id ?? r.code ?? "");
        if (!planCode || !Number.isFinite(price))
            return null;
        let network;
        try {
            network = networkFromRaw(networkRaw, this.networkIds);
        }
        catch {
            return null;
        }
        let sizeMb;
        try {
            sizeMb = snapVtuThousands(coerceSizeMb(sizeRaw), String(sizeRaw));
        }
        catch {
            return null;
        }
        return {
            providerId: this.id,
            planCode,
            network,
            sizeMb,
            validityDays: parseValidityDays(validityRaw),
            productType: productFromMsorg(bucket, planTypeRaw),
            priceNgn: price,
            label: label || undefined,
            raw: r,
        };
    }
    async purchase(args) {
        const payload = {
            network: this.networkIds[args.network],
            plan: args.planCode,
            mobile_number: args.phone,
            Ported_number: false,
            customer_ref: args.idempotencyKey,
        };
        const { status, body } = await this.request(this.paths.purchase, {
            method: "POST",
            body: JSON.stringify(payload),
        });
        return this.mapPurchaseResponse(status, body);
    }
    mapPurchaseResponse(httpStatus, body) {
        const b = (body ?? {});
        const statusStr = String(b.status ?? b.Status ?? "").toLowerCase();
        // Docs requery GET /api/data/<id>. Prefer the numeric id when both exist.
        const ref = String(b.id ?? b.ident ?? b.reference ?? b.ref ?? b.transid ?? "");
        const message = String(b.api_response ?? b.message ?? b.detail ?? b.msg ?? "");
        if (httpStatus >= 500) {
            return {
                ok: false,
                status: "failed",
                message: message || `HTTP ${httpStatus}`,
                raw: body,
                // 5xx after submit is ambiguous — provider may have processed it
                ambiguous: true,
            };
        }
        if (statusStr === "successful" ||
            statusStr === "success" ||
            statusStr === "true") {
            return {
                ok: true,
                status: "success",
                providerRef: ref || undefined,
                message,
                raw: body,
            };
        }
        if (statusStr === "processing" || statusStr === "pending") {
            return {
                ok: true,
                status: "pending",
                providerRef: ref || undefined,
                message,
                raw: body,
            };
        }
        if (httpStatus >= 400 || statusStr === "failed" || statusStr === "fail") {
            return {
                ok: false,
                status: "failed",
                providerRef: ref || undefined,
                message,
                raw: body,
            };
        }
        if (ref) {
            return {
                ok: true,
                status: "pending",
                providerRef: ref,
                message,
                raw: body,
            };
        }
        return {
            ok: false,
            status: "unknown",
            message: message || "Unrecognized response",
            raw: body,
        };
    }
    async getStatus(providerRef) {
        const path = this.paths.status.replaceAll("{ref}", encodeURIComponent(providerRef));
        const { status, body } = await this.request(path, { method: "GET" });
        const b = (body ?? {});
        const statusStr = String(b.status ?? b.Status ?? "").toLowerCase();
        let mapped = "unknown";
        if (statusStr.includes("success"))
            mapped = "success";
        else if (statusStr.includes("pend") || statusStr.includes("process"))
            mapped = "pending";
        else if (statusStr.includes("fail"))
            mapped = "failed";
        else if (status >= 400)
            mapped = "failed";
        return {
            providerId: this.id,
            providerRef,
            status: mapped,
            message: String(b.api_response ?? b.message ?? ""),
            raw: body,
        };
    }
}
//# sourceMappingURL=msorg.js.map