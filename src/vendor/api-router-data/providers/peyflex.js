/**
 * Peyflex data adapter.
 *
 * Documented data endpoints (not only airtime), confirmed two ways on
 * 2026-09-25:
 *   Postman collection headings include Data → Query Data Networks,
 *   Query Data Plans, Data Purchase:
 *   https://documenter.getpostman.com/view/17835214/2sB34imLMn
 *   The public PHP client encodes the same paths:
 *   https://github.com/henryejemuta/php-peyflex-vtu/blob/main/src/Client.php
 *
 *   Base: https://client.peyflex.com.ng/api/
 *   Auth: Authorization: Token <dashboard token>
 *   GET  data/networks
 *   GET  data/plans?network=<network id>
 *   POST data/purchase
 *        JSON { network, mobile_number, plan_code }
 *
 * A status/requery route is NOT in that PHP client and was not in the
 * Postman section list reviewed (profile, airtime, data, cable, electricity,
 * recharge card, betting, education, virtual number). getStatus does not
 * call a guessed URL. Set providers.peyflex.paths.status (use `{ref}`)
 * after reading the logged-in collection.
 *
 * Authenticated GET on 2026-10-04 (Token header, base URL ending in /api):
 *   GET data/networks/ → { networks: [{ name, identifier }] }
 *   GET data/plans/?network=<identifier> → { plans: [{ plan_code, amount, label }] }
 * The duration is inside label ("1GB = N395 (30 DAYS)"), not a validity field.
 * identifier values seen: mtn_gifting_data, glo_data, 9mobile_data,
 * airtel_data, mtn_data_share. Data Share stays productType unknown.
 *
 * The marketing table at https://peyflex.com.ng/data-pricing/ has no
 * product type and no validity. It is not loaded as a catalog.
 */
import { inferProductTypeFromLabel, normalizeNetwork, parseSizeToMb, parseValidityDays, } from "../catalog/normalize.js";
function joinUrl(base, path) {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
function sizeFromText(raw) {
    try {
        return parseSizeToMb(raw);
    }
    catch {
        const m = raw.match(/(\d+(?:\.\d+)?)\s*(gb|mb)\b/i);
        if (!m)
            return null;
        try {
            return parseSizeToMb(`${m[1]}${m[2]}`);
        }
        catch {
            return null;
        }
    }
}
function asRows(body) {
    if (Array.isArray(body))
        return body;
    if (!body || typeof body !== "object")
        return [];
    const b = body;
    for (const key of ["data", "plans", "networks", "result"]) {
        if (Array.isArray(b[key]))
            return b[key];
    }
    return [];
}
export function peyflexPlanCode(networkId, planCode) {
    return `${networkId}|${planCode}`;
}
export function splitPeyflexPlanCode(planCode) {
    const i = planCode.indexOf("|");
    if (i <= 0 || i === planCode.length - 1)
        return null;
    return { networkId: planCode.slice(0, i), code: planCode.slice(i + 1) };
}
function networkIdOf(row, fallback) {
    const id = row.identifier ??
        row.id ??
        row.network_id ??
        row.network ??
        row.slug ??
        row.code;
    return String(id ?? fallback);
}
/** Data Share stays unknown. CG and gifting come from the network title. */
function productFromPeyflexNetwork(title, ident) {
    const blob = `${title} ${ident}`.toLowerCase();
    if (/data\s*share|datashare|_share\b/.test(blob))
        return "unknown";
    const fromNet = inferProductTypeFromLabel(blob);
    if (fromNet !== "unknown")
        return fromNet;
    return "unknown";
}
/** Pull a real duration out of "1GB = N360 (30 DAYS)". No silent 30. */
function validityFromText(raw) {
    const s = raw.toLowerCase();
    const range = s.match(/(\d+)\s*[-–]\s*(\d+)\s*days?\b/);
    if (range)
        return Math.round((Number(range[1]) + Number(range[2])) / 2);
    const days = s.match(/(\d+)\s*days?\b/);
    if (days)
        return Number(days[1]);
    if (/\bmonth|monthly/.test(s))
        return 30;
    if (/\bweek|weekly/.test(s))
        return 7;
    return null;
}
export function parsePeyflexPlans(body, networkFallback, networkTitle = "") {
    const rows = asRows(body);
    const out = [];
    for (const row of rows) {
        if (!row || typeof row !== "object")
            continue;
        const r = row;
        const code = String(r.plan_code ?? r.planCode ?? r.code ?? r.plan_id ?? r.id ?? "").trim();
        const price = Number(r.api_price ?? r.amount ?? r.price ?? r.plan_amount ?? NaN);
        if (!code || !Number.isFinite(price))
            continue;
        const networkRaw = String(r.network ?? r.network_name ?? r.network_id ?? networkFallback);
        let network;
        try {
            network = normalizeNetwork(networkRaw);
        }
        catch {
            // network id may be mtn_sme / mtn_data_share rather than "mtn"
            const head = networkRaw.toLowerCase().split(/[_-]/)[0] ?? "";
            try {
                network = normalizeNetwork(head);
            }
            catch {
                continue;
            }
        }
        const label = String(r.label ?? r.name ?? r.plan ?? r.plan_name ?? r.title ?? code);
        const sizeMb = sizeFromText(String(r.size ?? r.volume ?? r.plan_size ?? label));
        if (sizeMb == null)
            continue;
        const validityField = r.validity ?? r.days ?? r.duration ?? r.validity_days;
        // Live rows (2026-10-04) put the duration in `label` and have no validity field.
        const validityDays = validityField != null && validityField !== ""
            ? parseValidityDays(validityField)
            : validityFromText(label);
        if (validityDays == null)
            continue;
        // Prefix with the network id we queried. A plan's own `id` is the plan
        // code, not the network, so it must not replace networkFallback.
        const networkId = networkFallback || networkIdOf(r, "");
        const typeField = String(r.type ?? r.plan_type ?? r.category ?? "");
        const fromNetwork = productFromPeyflexNetwork(networkTitle, networkFallback);
        const productType = typeField.trim()
            ? inferProductTypeFromLabel(typeField)
            : fromNetwork !== "unknown"
                ? fromNetwork
                : inferProductTypeFromLabel(label);
        out.push({
            providerId: "peyflex",
            planCode: peyflexPlanCode(networkId, code),
            network,
            sizeMb,
            validityDays,
            productType,
            priceNgn: price,
            label: label || undefined,
            raw: row,
        });
    }
    return out;
}
export class PeyflexAdapter {
    id = "peyflex";
    baseUrl;
    apiToken;
    timeoutMs;
    fetchFn;
    networksPath;
    plansPath;
    purchasePath;
    statusPath;
    constructor(config, fetchFn) {
        const trimmed = (config.baseUrl || "https://client.peyflex.com.ng").replace(/\/+$/, "");
        this.baseUrl = trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
        this.apiToken = config.apiToken ?? config.apiKey;
        this.timeoutMs = config.timeoutMs ?? 30_000;
        this.fetchFn = fetchFn ?? fetch;
        this.networksPath = "/data/networks";
        this.plansPath = config.paths?.listPlans || "/data/plans";
        this.purchasePath = config.paths?.purchase || "/data/purchase";
        this.statusPath = config.paths?.status;
    }
    headers() {
        const h = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };
        if (this.apiToken)
            h.Authorization = `Token ${this.apiToken}`;
        return h;
    }
    async request(path, init) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
        try {
            const res = await this.fetchFn(joinUrl(this.baseUrl, path), {
                ...init,
                headers: {
                    ...this.headers(),
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
                /* keep */
            }
            return { status: res.status, body };
        }
        finally {
            clearTimeout(t);
        }
    }
    async listPlans() {
        const networksRes = await this.request(this.networksPath, { method: "GET" });
        if (networksRes.status >= 400) {
            throw new Error(`peyflex networks HTTP ${networksRes.status}`);
        }
        const networks = asRows(networksRes.body);
        const listed = networks.flatMap((row) => {
            if (!row || typeof row !== "object")
                return [];
            const rec = row;
            const id = networkIdOf(rec, "");
            if (!id)
                return [];
            const title = String(rec.name ?? rec.title ?? "");
            return [{ id, title }];
        });
        if (listed.length === 0) {
            throw new Error("peyflex networks response had no network ids");
        }
        const out = [];
        for (const { id, title } of listed) {
            const q = new URLSearchParams({ network: id });
            const sep = this.plansPath.includes("?") ? "&" : "?";
            const { status, body } = await this.request(`${this.plansPath}${sep}${q.toString()}`, { method: "GET" });
            if (status >= 400) {
                throw new Error(`peyflex plans HTTP ${status} for ${id}`);
            }
            out.push(...parsePeyflexPlans(body, id, title));
        }
        return out;
    }
    async purchase(args) {
        const parsed = splitPeyflexPlanCode(args.planCode);
        if (!parsed) {
            return {
                ok: false,
                status: "failed",
                message: "peyflex planCode must be networkId|plan_code",
            };
        }
        const { status, body } = await this.request(this.purchasePath, {
            method: "POST",
            body: JSON.stringify({
                network: parsed.networkId,
                mobile_number: args.phone,
                plan_code: parsed.code,
            }),
        });
        const b = (body ?? {});
        const statusStr = String(b.status ?? "").toLowerCase();
        const ref = String(b.reference ?? b.transaction_id ?? b.id ?? "");
        const message = String(b.message ?? "");
        if (status >= 500) {
            return {
                ok: false,
                status: "failed",
                message: message || `HTTP ${status}`,
                raw: body,
                ambiguous: true,
            };
        }
        if (statusStr === "success" || statusStr === "successful") {
            return {
                ok: true,
                status: "success",
                providerRef: ref || args.idempotencyKey,
                message,
                raw: body,
            };
        }
        if (statusStr.includes("pend") || statusStr.includes("process")) {
            return {
                ok: true,
                status: "pending",
                providerRef: ref || undefined,
                message,
                raw: body,
            };
        }
        if (status >= 400 || statusStr.includes("fail")) {
            return { ok: false, status: "failed", message, raw: body };
        }
        if (ref) {
            return { ok: true, status: "pending", providerRef: ref, message, raw: body };
        }
        return {
            ok: false,
            status: "unknown",
            message: message || "Unrecognized peyflex response",
            raw: body,
        };
    }
    async getStatus(providerRef) {
        if (!this.statusPath) {
            return {
                providerId: this.id,
                providerRef,
                status: "unknown",
                message: "Peyflex has no documented data requery path in the Postman sections or PHP client reviewed on 2026-09-25. Set paths.status (with {ref}) after login. Purchase responses include reference.",
            };
        }
        const path = this.statusPath.replaceAll("{ref}", encodeURIComponent(providerRef));
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
export function createPeyflexAdapter(config, fetchFn) {
    return new PeyflexAdapter(config, fetchFn);
}
//# sourceMappingURL=peyflex.js.map