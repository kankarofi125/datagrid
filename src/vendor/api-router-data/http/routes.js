import { RouterError } from "../types.js";
import { BillsRouterError } from "../bills/types.js";
const MAX_BODY_BYTES = 64 * 1024;
async function readJson(req) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
        total += chunk.length;
        if (total > MAX_BODY_BYTES) {
            throw new RouterError("Request body too large", "BODY_TOO_LARGE");
        }
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new RouterError("Invalid JSON body", "INVALID_JSON");
    }
}
function send(res, status, body) {
    const json = JSON.stringify(body);
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(json),
    });
    res.end(json);
}
function errorStatus(err) {
    const code = err instanceof RouterError || err instanceof BillsRouterError
        ? err.code
        : null;
    if (code) {
        if (code === "PROVIDER_NOT_CONFIGURED")
            return 404;
        if (code === "UNAUTHORIZED")
            return 401;
        return 400;
    }
    return 500;
}
/** Write endpoints require a bearer API key when one is configured. */
function checkAuth(req) {
    const expected = process.env.API_KEY;
    if (!expected)
        return; // auth disabled (dev mode) when API_KEY unset
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (token !== expected) {
        throw new RouterError("Missing or invalid API key", "UNAUTHORIZED");
    }
}
const VALID_NETWORKS = new Set(["mtn", "airtel", "glo", "9mobile"]);
const VALID_PRODUCT_TYPES = new Set([
    "sme",
    "cg",
    "sme2",
    "gifting",
    "direct",
    "unknown",
]);
function parseBodyNetwork(body) {
    const raw = String(body.network ?? "").toLowerCase();
    if (!VALID_NETWORKS.has(raw)) {
        throw new RouterError(`Invalid network: ${String(body.network)}. Expected one of mtn|airtel|glo|9mobile`, "INVALID_NETWORK");
    }
    return raw;
}
function parseBodyProductType(body) {
    const raw = String(body.productType ?? "").toLowerCase();
    if (!VALID_PRODUCT_TYPES.has(raw)) {
        throw new RouterError(`Invalid productType: ${String(body.productType)}. Expected one of sme|cg|sme2|gifting|direct|unknown`, "INVALID_PRODUCT_TYPE");
    }
    return raw;
}
export async function handleRequest(router, bills, req, res) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    const method = (req.method ?? "GET").toUpperCase();
    try {
        if (method === "GET" && path === "/v1/health") {
            send(res, 200, { ok: true, service: "api-router-data" });
            return;
        }
        // All /v1/data/* endpoints are authenticated when API_KEY is set.
        checkAuth(req);
        if (method === "POST" && path === "/v1/data/quote") {
            const body = (await readJson(req));
            const result = await router.quote({
                network: parseBodyNetwork(body),
                size: body.size,
                validityDays: Number(body.validityDays),
                productType: parseBodyProductType(body),
                preferProvider: body.preferProvider,
            });
            send(res, result.selected ? 200 : 422, result);
            return;
        }
        if (method === "POST" && path === "/v1/data/purchase") {
            const body = (await readJson(req));
            const result = await router.purchase({
                network: parseBodyNetwork(body),
                size: body.size,
                validityDays: Number(body.validityDays),
                productType: parseBodyProductType(body),
                phone: String(body.phone ?? ""),
                idempotencyKey: String(body.idempotencyKey ?? body.clientRef ?? ""),
                preferProvider: body.preferProvider,
            });
            send(res, result.ok ? 200 : 502, result);
            return;
        }
        const statusMatch = path.match(/^\/v1\/data\/status\/([^/]+)\/([^/]+)$/);
        if (method === "GET" && statusMatch) {
            const providerId = decodeURIComponent(statusMatch[1]);
            const ref = decodeURIComponent(statusMatch[2]);
            const result = await router.getStatus(providerId, ref);
            send(res, 200, result);
            return;
        }
        if (method === "POST" && path === "/v1/data/refresh-catalogs") {
            const counts = await router.refreshCatalogs();
            send(res, 200, { ok: true, counts });
            return;
        }
        if (method === "GET" && path === "/v1/data/popular") {
            const network = url.searchParams.get("network") ?? undefined;
            const matrix = router.getPopularPlansMatrix(network);
            send(res, 200, matrix);
            return;
        }
        if (method === "GET" && path === "/v1/data/routing-table") {
            const network = url.searchParams.get("network") ?? undefined;
            const table = await router.buildNetworkRoutingTable(network ? { network } : undefined);
            send(res, 200, table);
            return;
        }
        if (path.startsWith("/v1/airtime/") || path.startsWith("/v1/electricity/") || path.startsWith("/v1/cable/") || path.startsWith("/v1/pins/") || path.startsWith("/v1/bills/")) {
            if (!bills) {
                send(res, 503, { error: "bills router is not configured" });
                return;
            }
            await handleBillsRequest(bills, method, path, req, res);
            return;
        }
        send(res, 404, { error: "not_found", path });
    }
    catch (err) {
        send(res, errorStatus(err), {
            error: err instanceof Error ? err.message : String(err),
            code: err instanceof RouterError || err instanceof BillsRouterError
                ? err.code
                : "INTERNAL",
        });
    }
}
function requiredString(body, key) {
    const v = String(body[key] ?? "").trim();
    if (!v)
        throw new RouterError(`Missing ${key}`, "BAD_REQUEST");
    return v;
}
function requiredAmount(body, key = "amount") {
    const n = Number(body[key]);
    if (!Number.isFinite(n) || n <= 0) {
        throw new RouterError(`Invalid ${key}`, "BAD_REQUEST");
    }
    return n;
}
function optionalPhone(body) {
    const v = String(body.phone ?? "").trim();
    return v || undefined;
}
async function handleBillsRequest(bills, method, path, req, res) {
    if (method === "POST" && path === "/v1/airtime/purchase") {
        const body = (await readJson(req));
        const result = await bills.buyAirtime({
            network: parseBodyNetwork(body),
            phone: requiredString(body, "phone"),
            amount: requiredAmount(body),
            idempotencyKey: String(body.idempotencyKey ?? body.clientRef ?? ""),
        });
        send(res, result.ok ? 200 : 502, result);
        return;
    }
    if (method === "POST" && path === "/v1/electricity/validate") {
        const body = (await readJson(req));
        const meterType = String(body.meterType ?? "prepaid").toLowerCase();
        const result = await bills.validateMeter({
            disco: requiredString(body, "disco"),
            meter: requiredString(body, "meter"),
            meterType: meterType === "postpaid" ? "postpaid" : "prepaid",
        });
        send(res, result.ok ? 200 : 422, result);
        return;
    }
    if (method === "POST" && path === "/v1/electricity/purchase") {
        const body = (await readJson(req));
        const meterType = String(body.meterType ?? "prepaid").toLowerCase();
        const result = await bills.buyElectricity({
            disco: requiredString(body, "disco"),
            meter: requiredString(body, "meter"),
            meterType: meterType === "postpaid" ? "postpaid" : "prepaid",
            amount: requiredAmount(body),
            phone: optionalPhone(body),
            idempotencyKey: String(body.idempotencyKey ?? body.clientRef ?? ""),
        });
        send(res, result.ok ? 200 : 502, result);
        return;
    }
    if (method === "POST" && path === "/v1/cable/validate") {
        const body = (await readJson(req));
        const result = await bills.validateIUC({
            biller: requiredString(body, "biller"),
            smartCard: requiredString(body, "smartCard"),
        });
        send(res, result.ok ? 200 : 422, result);
        return;
    }
    if (method === "POST" && path === "/v1/cable/purchase") {
        const body = (await readJson(req));
        const result = await bills.buyCable({
            biller: requiredString(body, "biller"),
            smartCard: requiredString(body, "smartCard"),
            packageCode: requiredString(body, "packageCode"),
            amount: requiredAmount(body),
            phone: optionalPhone(body),
            idempotencyKey: String(body.idempotencyKey ?? body.clientRef ?? ""),
        });
        send(res, result.ok ? 200 : 502, result);
        return;
    }
    if (method === "POST" && path === "/v1/pins/purchase") {
        const body = (await readJson(req));
        const quantity = Math.max(1, Math.floor(Number(body.quantity ?? 1)));
        const result = await bills.buyExamPin({
            biller: requiredString(body, "biller"),
            quantity,
            amount: requiredAmount(body),
            phone: optionalPhone(body),
            idempotencyKey: String(body.idempotencyKey ?? body.clientRef ?? ""),
        });
        send(res, result.ok ? 200 : 502, result);
        return;
    }
    const billsStatusMatch = path.match(/^\/v1\/bills\/status\/([^/]+)\/([^/]+)$/);
    if (method === "GET" && billsStatusMatch) {
        const providerId = decodeURIComponent(billsStatusMatch[1]);
        const ref = decodeURIComponent(billsStatusMatch[2]);
        const result = await bills.getStatus(providerId, ref);
        send(res, 200, result);
        return;
    }
    send(res, 404, { error: "not_found", path });
}
//# sourceMappingURL=routes.js.map