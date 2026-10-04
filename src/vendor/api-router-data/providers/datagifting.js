/**
 * DataGifting REST adapter.
 * Docs: https://v6.datagifting.com.ng/web/APIDocs.php
 *
 *   GET /web/api/data-plans.php?api_key=
 *   GET /web/api/data.php?api_key=&type=&network=&quantity=&phone_no=
 *   GET /web/api/requery.php?api_key=&reference=
 *
 * type: sme-data | shared-data | cg-data | dd-data
 */
import { inferProductTypeFromLabel, normalizeNetwork, parseSizeToMb, parseValidityDays, } from "../catalog/normalize.js";
function joinUrl(base, path) {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
function productTypeToDg(t) {
    switch (t) {
        case "sme":
        case "sme2":
            return "sme-data";
        case "cg":
            return "cg-data";
        case "gifting":
            return "shared-data";
        case "direct":
            return "dd-data";
        default:
            return "cg-data";
    }
}
function dgTypeToProduct(t) {
    const x = t.toLowerCase();
    if (x.includes("sme"))
        return "sme";
    if (x.includes("cg") || x.includes("corporate"))
        return "cg";
    if (x.includes("shared") || x.includes("gift"))
        return "gifting";
    if (x.includes("dd") || x.includes("direct"))
        return "direct";
    return inferProductTypeFromLabel(t);
}
export class DataGiftingAdapter {
    id = "datagifting";
    baseUrl;
    apiKey;
    timeoutMs;
    fetchFn;
    constructor(config, fetchFn) {
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey ?? config.apiToken ?? "";
        this.timeoutMs = config.timeoutMs ?? 30_000;
        this.fetchFn = fetchFn ?? fetch;
    }
    async get(path, params) {
        const q = new URLSearchParams({ api_key: this.apiKey, ...params });
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
        try {
            const res = await this.fetchFn(`${joinUrl(this.baseUrl, path)}?${q}`, {
                method: "GET",
                headers: { Accept: "application/json" },
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
        const { status, body } = await this.get("/web/api/data-plans.php", {});
        if (status >= 400)
            throw new Error(`datagifting catalog HTTP ${status}`);
        return this.parsePlans(body);
    }
    parsePlans(body) {
        // Docs return networks → plans; tolerate flat arrays too.
        const out = [];
        const pushRow = (r, networkHint) => {
            const planCode = String(r.quantity ?? r.plan_code ?? r.code ?? r.id ?? "");
            const price = Number(r.amount ?? r.price ?? r.plan_amount ?? NaN);
            if (!planCode || !Number.isFinite(price))
                return;
            let network;
            try {
                network = normalizeNetwork(String(r.network ?? networkHint ?? "mtn"));
            }
            catch {
                return;
            }
            const label = String(r.name ?? r.plan_name ?? r.plan ?? planCode);
            let sizeMb;
            try {
                sizeMb = parseSizeToMb(String(r.size ?? r.volume ?? r.data_size ?? label));
            }
            catch {
                return;
            }
            out.push({
                providerId: this.id,
                planCode,
                network,
                sizeMb,
                validityDays: parseValidityDays((r.validity ?? r.days ?? r.duration ?? 30)),
                productType: dgTypeToProduct(String(r.type ?? r.data_type ?? label)),
                priceNgn: price,
                label: label || undefined,
                raw: r,
            });
        };
        if (Array.isArray(body)) {
            for (const row of body)
                pushRow(row);
            return out;
        }
        const root = body;
        const data = root?.data ?? root?.plans ?? root;
        if (Array.isArray(data)) {
            for (const row of data)
                pushRow(row);
            return out;
        }
        if (data && typeof data === "object") {
            for (const [net, plans] of Object.entries(data)) {
                if (Array.isArray(plans)) {
                    for (const row of plans)
                        pushRow(row, net);
                }
                else if (plans && typeof plans === "object") {
                    for (const [, typePlans] of Object.entries(plans)) {
                        if (Array.isArray(typePlans)) {
                            for (const row of typePlans)
                                pushRow(row, net);
                        }
                    }
                }
            }
        }
        return out;
    }
    async purchase(args) {
        const { status, body } = await this.get("/web/api/data.php", {
            type: productTypeToDg(args.productType),
            network: args.network,
            quantity: args.planCode,
            phone_no: args.phone,
            // Some deployments accept client ref; harmless if ignored.
            client_ref: args.idempotencyKey,
        });
        const b = (body ?? {});
        const statusStr = String(b.status ?? "").toLowerCase();
        const ref = String(b.ref ?? b.reference ?? "");
        const message = String(b.desc ?? b.message ?? "");
        if (status >= 500) {
            return {
                ok: false,
                status: "failed",
                message: message || `HTTP ${status}`,
                raw: body,
                ambiguous: true,
            };
        }
        if (statusStr === "success") {
            return { ok: true, status: "success", providerRef: ref || undefined, message, raw: body };
        }
        if (statusStr === "pending") {
            return { ok: true, status: "pending", providerRef: ref || undefined, message, raw: body };
        }
        if (statusStr === "failed" || status >= 400) {
            return { ok: false, status: "failed", providerRef: ref || undefined, message, raw: body };
        }
        if (ref)
            return { ok: true, status: "pending", providerRef: ref, message, raw: body };
        return { ok: false, status: "unknown", message: message || "Unrecognized", raw: body };
    }
    async getStatus(providerRef) {
        const { status, body } = await this.get("/web/api/requery.php", {
            reference: providerRef,
        });
        const b = (body ?? {});
        const statusStr = String(b.status ?? "").toLowerCase();
        let mapped = "unknown";
        if (statusStr === "success")
            mapped = "success";
        else if (statusStr === "pending")
            mapped = "pending";
        else if (statusStr === "failed" || status >= 400)
            mapped = "failed";
        return {
            providerId: this.id,
            providerRef,
            status: mapped,
            message: String(b.desc ?? b.message ?? ""),
            raw: body,
        };
    }
}
export function createDataGiftingAdapter(config, fetchFn) {
    return new DataGiftingAdapter(config, fetchFn);
}
//# sourceMappingURL=datagifting.js.map