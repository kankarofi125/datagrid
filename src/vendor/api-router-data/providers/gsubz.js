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
import { normalizeNetwork, parseSizeToMb } from "../catalog/normalize.js";
export const GSUBZ_DEFAULT_SERVICES = [
    "mtn_sme",
    "mtn_gifting",
    "glo_data",
    "glo_sme",
    "airtel_sme",
    "etisalat_data",
];
const SERVICE_NETWORK = {
    mtn_sme: "mtn",
    mtn_gifting: "mtn",
    glo_data: "glo",
    glo_sme: "glo",
    airtel_sme: "airtel",
    etisalat_data: "9mobile",
};
const SERVICE_PRODUCT = {
    mtn_sme: "sme",
    mtn_gifting: "gifting",
    // Live service title is "Glo Corporate Gifting Data".
    glo_data: "cg",
    glo_sme: "sme",
    airtel_sme: "sme",
    // Live title is "9mobile or T2 Data" — not SME and not CG.
    etisalat_data: "unknown",
};
function productFromService(service) {
    const known = SERVICE_PRODUCT[service];
    if (known)
        return known;
    const s = service.toLowerCase();
    if (s.includes("sme2") || s.includes("sme_2"))
        return "sme2";
    if (s.includes("sme"))
        return "sme";
    if (s.includes("cg") || s.includes("corporate"))
        return "cg";
    if (s.includes("gift"))
        return "gifting";
    return "unknown";
}
function joinUrl(base, path) {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
export function gsubzPlanCode(service, planField, value) {
    return `${service}|${planField}|${value}`;
}
export function splitGsubzPlanCode(planCode) {
    const parts = planCode.split("|");
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2])
        return null;
    return { service: parts[0], planField: parts[1], value: parts[2] };
}
function sizeFromDisplay(name) {
    const m = name.match(/(\d+(?:\.\d+)?)\s*(gb|mb)\b/i);
    if (!m)
        return null;
    try {
        return parseSizeToMb(`${m[1]}${m[2]}`);
    }
    catch {
        return null;
    }
}
function daysFromDisplay(name) {
    const m = name.match(/(\d+)\s*days?\b/i);
    if (!m)
        return null;
    return Number(m[1]);
}
export function parseGsubzServicePlans(service, body) {
    if (!body || typeof body !== "object")
        return [];
    const root = body;
    if (root.error)
        return [];
    const plans = Array.isArray(root.plans) ? root.plans : [];
    const planField = String(root.PlanName || "plan");
    const serviceTitle = String(root.service ?? service);
    const network = SERVICE_NETWORK[service];
    const productType = productFromService(service);
    if (!network) {
        try {
            // Unknown service id: only accept an explicit network prefix.
            normalizeNetwork(service.split("_")[0] ?? "");
        }
        catch {
            return [];
        }
    }
    const resolvedNetwork = network ??
        (service.startsWith("airtel")
            ? "airtel"
            : service.startsWith("glo")
                ? "glo"
                : service.startsWith("mtn")
                    ? "mtn"
                    : "9mobile");
    const out = [];
    for (const row of plans) {
        if (!row || typeof row !== "object")
            continue;
        const r = row;
        const display = String(r.displayName ?? "").trim();
        const value = String(r.value ?? "").trim();
        const apiPrice = Number(r.api_price);
        const retail = Number(r.price);
        const price = Number.isFinite(apiPrice) ? apiPrice : retail;
        if (!value || !Number.isFinite(price))
            continue;
        const sizeMb = sizeFromDisplay(display);
        const validityDays = daysFromDisplay(display);
        // Do not invent validity. Rows without a day count are skipped.
        if (sizeMb == null || validityDays == null)
            continue;
        out.push({
            providerId: "gsubz",
            planCode: gsubzPlanCode(service, planField, value),
            network: resolvedNetwork,
            sizeMb,
            validityDays,
            productType,
            priceNgn: price,
            label: display || undefined,
            raw: {
                service,
                serviceTitle,
                planField,
                value,
                retailPrice: Number.isFinite(retail) ? retail : null,
                apiPrice: Number.isFinite(apiPrice) ? apiPrice : null,
                discount: root.discount ?? null,
                displayName: display,
            },
        });
    }
    return out;
}
export class GsubzAdapter {
    id = "gsubz";
    baseUrl;
    apiKey;
    timeoutMs;
    fetchFn;
    services;
    plansPath;
    payPath;
    verifyPath;
    constructor(config, fetchFn) {
        this.baseUrl = config.baseUrl || "https://api.gsubz.com";
        this.apiKey = config.apiKey ?? config.apiToken;
        this.timeoutMs = config.timeoutMs ?? 30_000;
        this.fetchFn = fetchFn ?? fetch;
        this.services =
            config.services && config.services.length > 0
                ? config.services
                : [...GSUBZ_DEFAULT_SERVICES];
        this.plansPath = config.paths?.listPlans || "/api/plans/";
        this.payPath = config.paths?.purchase || "/api/pay/";
        this.verifyPath = config.paths?.status || "/api/verify/";
    }
    headers(form = false) {
        const h = { Accept: "application/json" };
        if (form)
            h["Content-Type"] = "application/x-www-form-urlencoded";
        if (this.apiKey)
            h.Authorization = `Bearer ${this.apiKey}`;
        return h;
    }
    async request(path, init, form = false) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
        try {
            const res = await this.fetchFn(joinUrl(this.baseUrl, path), {
                ...init,
                headers: {
                    ...this.headers(form),
                    ...init?.headers,
                },
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
        const out = [];
        const errors = [];
        for (const service of this.services) {
            const q = new URLSearchParams({ service });
            const sep = this.plansPath.includes("?") ? "&" : "?";
            try {
                const { status, body } = await this.request(`${this.plansPath}${sep}${q.toString()}`, { method: "GET" });
                if (status >= 400) {
                    errors.push(`${service} HTTP ${status}`);
                    continue;
                }
                out.push(...parseGsubzServicePlans(service, body));
            }
            catch (err) {
                errors.push(`${service} ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        if (out.length === 0 && errors.length > 0) {
            throw new Error(`gsubz catalog failed: ${errors.join("; ")}`);
        }
        return out;
    }
    async purchase(args) {
        const parsed = splitGsubzPlanCode(args.planCode);
        if (!parsed) {
            return {
                ok: false,
                status: "failed",
                message: "gsubz planCode must be service|planField|value",
            };
        }
        if (!this.apiKey) {
            return {
                ok: false,
                status: "failed",
                message: "gsubz api key is not configured",
            };
        }
        const form = new URLSearchParams();
        form.set("serviceID", parsed.service);
        form.set(parsed.planField, parsed.value);
        form.set("api", this.apiKey);
        form.set("amount", "");
        form.set("phone", args.phone);
        form.set("requestID", args.idempotencyKey);
        const { status, body } = await this.request(this.payPath, { method: "POST", body: form.toString() }, true);
        return mapGsubzPurchase(status, body, args.idempotencyKey);
    }
    async getStatus(providerRef) {
        if (!this.apiKey) {
            return {
                providerId: this.id,
                providerRef,
                status: "unknown",
                message: "gsubz api key is not configured",
            };
        }
        const form = new URLSearchParams();
        form.set("requestID", providerRef);
        form.set("api", this.apiKey);
        const { status, body } = await this.request(this.verifyPath, { method: "POST", body: form.toString() }, true);
        const b = (body ?? {});
        const statusStr = String(b.status ?? "").toLowerCase();
        const desc = String(b.description ?? b.api_response ?? "");
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
            message: desc,
            raw: body,
        };
    }
}
export function mapGsubzPurchase(httpStatus, body, requestId) {
    const b = (body ?? {});
    const content = (b.content ?? {});
    const statusStr = String(b.status ?? content.status ?? "").toUpperCase();
    const code = Number(b.code ?? content.code ?? httpStatus);
    const message = String(b.description ?? content.description ?? b.api_response ?? content.api_response ?? "");
    // Docs: verify by the requestID we sent, not by transactionID.
    const providerRef = requestId;
    // Documented: 502 GATEWAY_ERROR is safe to retry (upstream did not respond).
    if (code === 502 || statusStr.includes("GATEWAY_ERROR")) {
        return {
            ok: false,
            status: "failed",
            providerRef,
            message: message || "GATEWAY_ERROR",
            raw: body,
        };
    }
    if (httpStatus >= 500) {
        return {
            ok: false,
            status: "failed",
            providerRef,
            message: message || `HTTP ${httpStatus}`,
            raw: body,
            ambiguous: true,
        };
    }
    if (statusStr.includes("TRANSACTION_SUCCESSFUL") || statusStr === "SUCCESS") {
        return { ok: true, status: "success", providerRef, message, raw: body };
    }
    if (statusStr.includes("PEND") || statusStr.includes("PROCESS")) {
        return { ok: true, status: "pending", providerRef, message, raw: body };
    }
    if (statusStr.includes("FAIL") ||
        httpStatus >= 400 ||
        code === 402 ||
        code === 401 ||
        code === 406) {
        return { ok: false, status: "failed", providerRef, message, raw: body };
    }
    return {
        ok: false,
        status: "unknown",
        providerRef,
        message: message || "Unrecognized gsubz response",
        raw: body,
    };
}
export function createGsubzAdapter(config, fetchFn) {
    return new GsubzAdapter(config, fetchFn);
}
//# sourceMappingURL=gsubz.js.map