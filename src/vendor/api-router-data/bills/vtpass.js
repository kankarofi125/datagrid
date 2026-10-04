/**
 * VTpass bills adapter — airtime, electricity, cable/Showmax, WAEC pins.
 *
 * Shapes follow https://vtpass.com/documentation/ (verified 2026-10-04):
 * - POST /pay {request_id, serviceID, billersCode?, variation_code?, amount?, phone?, quantity?, subscription_type?}
 * - POST /merchant-verify {billersCode, serviceID, type?}
 * - POST /api/requery {request_id}
 * - GET /service-variations?serviceID=X
 * - Success: code "000" + content.transactions.status "delivered".
 *
 * Auth: `api-key` + `secret-key` headers.
 */
import { createHash } from "node:crypto";
const VARIATION_TTL_MS = 6 * 60 * 60 * 1000;
const AIRTIME_SERVICE_IDS = {
    mtn: "mtn",
    glo: "glo",
    airtel: "airtel",
    "9mobile": "etisalat",
};
const DISCO_SERVICE_IDS = {
    AEDC: "abuja-electric",
    BEDC: "benin-electric",
    EEDC: "enugu-electric",
    EKEDC: "eko-electric",
    IBEDC: "ibadan-electric",
    IKEDC: "ikeja-electric",
    JEDC: "jos-electric",
    KAEDCO: "kano-electric",
    KEDCO: "kaduna-electric",
    PHED: "portharcourt-electric",
    YEDC: "yola-electric",
};
const CABLE_SERVICE_IDS = {
    DSTV: "dstv",
    GOTV: "gotv",
    STARTIMES: "startimes",
    SHOWMAX: "showmax",
};
/** "BILLER:PACKAGE" → variation_code (docs-verified subset). */
const PACKAGE_CODES = {
    "DSTV:PADI": "dstv-padi",
    "DSTV:YANGA": "dstv-yanga",
    "GOTV:JOLLI": "gotv-jolli",
    "STARTIMES:NOVA": "nova",
};
/**
 * Canonical exam biller → VTpass serviceID + documented default variation.
 * VTpass documents WAEC result checker only (no NECO/NABTEB).
 */
const EXAM_PRODUCTS = {
    WAEC: { serviceID: "waec", defaultVariation: "waecdirect" },
};
function joinUrl(base, path) {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
/**
 * VTpass request_id rule (docs: "How to generate Request ID"): ≥12 chars,
 * first 12 numeric as YYYYMMDDHHII in Africa/Lagos. Derived deterministically
 * from the idempotency key so retries reuse the provider reference.
 */
export function vtpassRequestId(idempotencyKey, now = new Date()) {
    const lagos = new Date(now.getTime() + 60 * 60 * 1000);
    const p = (n) => String(n).padStart(2, "0");
    const stamp = `${lagos.getUTCFullYear()}${p(lagos.getUTCMonth() + 1)}${p(lagos.getUTCDate())}` +
        `${p(lagos.getUTCHours())}${p(lagos.getUTCMinutes())}`;
    const hash = createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 16);
    return `${stamp}${hash}`;
}
export function createVtpassAdapter(config, fetchFn) {
    const baseUrl = config.baseUrl;
    const timeoutMs = config.timeoutMs ?? 15000;
    const fetchImpl = fetchFn ?? fetch;
    const paths = {
        pay: config.paths?.pay ?? "/pay",
        verify: config.paths?.verify ?? "/merchant-verify",
        requery: config.paths?.requery ?? "/api/requery",
        variations: config.paths?.variations ?? "/service-variations",
    };
    const discoIds = { ...DISCO_SERVICE_IDS, ...config.discoServiceIds };
    const cableIds = { ...CABLE_SERVICE_IDS, ...config.cableServiceIds };
    const packageCodes = { ...PACKAGE_CODES, ...config.packageCodes };
    const examProducts = { ...EXAM_PRODUCTS, ...config.examServiceIds };
    const variationCache = new Map();
    function headers() {
        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            "api-key": config.apiKey ?? "",
            "secret-key": config.secretKey ?? "",
        };
    }
    async function post(path, body) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const res = await fetchImpl(joinUrl(baseUrl, path), {
                method: "POST",
                headers: headers(),
                body: JSON.stringify(body),
                signal: ctrl.signal,
            });
            const text = await res.text();
            let data = {};
            try {
                data = text ? JSON.parse(text) : {};
            }
            catch {
                /* keep {} */
            }
            return { http: res.status, data };
        }
        finally {
            clearTimeout(t);
        }
    }
    async function getVariations(serviceID) {
        const cached = variationCache.get(serviceID);
        if (cached && Date.now() - cached.at < VARIATION_TTL_MS)
            return cached.rows;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const res = await fetchImpl(`${joinUrl(baseUrl, paths.variations)}?serviceID=${encodeURIComponent(serviceID)}`, { headers: headers(), signal: ctrl.signal });
            const data = (await res.json().catch(() => ({})));
            const rows = [];
            for (const v of data.content?.variations ?? []) {
                const code = String(v.variation_code ?? "");
                if (!code)
                    continue;
                const amount = Number(v.variation_amount);
                rows.push({ code, amount: Number.isFinite(amount) ? amount : null });
            }
            variationCache.set(serviceID, { at: Date.now(), rows });
            return rows;
        }
        catch {
            return cached?.rows ?? [];
        }
        finally {
            clearTimeout(t);
        }
    }
    /**
     * Resolve a variation code + live price. Static map is a fast path, but
     * the live catalog (6h cache) still supplies the price for the margin
     * guard. A static code missing from a non-empty live list fails instead
     * of amount-guessing a different bouquet.
     */
    async function resolveVariation(args) {
        const staticCode = args.packageKey && args.packageKey ? packageCodes[args.packageKey] : undefined;
        const rows = await getVariations(args.serviceID);
        if (staticCode) {
            const live = rows.find((r) => r.code.toLowerCase() === staticCode.toLowerCase());
            if (live)
                return { code: live.code, livePrice: live.amount };
            if (rows.length === 0)
                return { code: staticCode, livePrice: null };
            return null;
        }
        if (args.packageCode) {
            const exact = rows.find((r) => r.code.toLowerCase() === args.packageCode.toLowerCase());
            if (exact)
                return { code: exact.code, livePrice: exact.amount };
        }
        if (args.defaultCode) {
            const known = rows.find((r) => r.code.toLowerCase() === args.defaultCode.toLowerCase());
            if (known)
                return { code: known.code, livePrice: known.amount };
            // Documented code not in the live list — trust docs over the fetch.
            if (rows.length === 0)
                return { code: args.defaultCode, livePrice: null };
        }
        if (args.amount != null) {
            const hits = rows.filter((r) => r.amount === args.amount);
            if (hits.length === 1)
                return { code: hits[0].code, livePrice: hits[0].amount };
        }
        return null;
    }
    function txOf(data) {
        const content = (data.content ?? {});
        return (content.transactions ?? {});
    }
    function isTimeout(err) {
        return (err instanceof Error &&
            (err.name === "AbortError" ||
                err.name === "TimeoutError" ||
                /abort|timeout/i.test(err.message)));
    }
    /** Map a /pay response. Unknown shapes are ambiguous (money may have moved). */
    function mapPay(http, data, requestId) {
        const code = String(data.code ?? "");
        const tx = txOf(data);
        const status = String(tx.status ?? "").toLowerCase();
        const ref = String(data.requestId ?? tx.transactionId ?? requestId ?? "") || undefined;
        const message = String(data.response_description ?? tx.status ?? `VTpass HTTP ${http}`) ||
            undefined;
        if (code === "000" && status === "delivered") {
            const cards = Array.isArray(data.cards)
                ? (data.cards ?? [])
                : [];
            const pins = cards
                .map((c) => {
                const s = String(c.Serial ?? c.serial ?? "");
                const p = String(c.Pin ?? c.pin ?? "");
                return s || p ? `Serial ${s}, Pin ${p}`.trim() : "";
            })
                .filter(Boolean);
            return {
                ok: true,
                status: "success",
                providerRef: ref,
                token: typeof data.purchased_code === "string" && data.purchased_code
                    ? data.purchased_code
                    : undefined,
                pins: pins.length ? pins : undefined,
                customerName: typeof tx.name === "string" && tx.name ? tx.name : undefined,
                message,
                raw: data,
            };
        }
        if (http >= 500 ||
            http === 429 ||
            status === "pending" ||
            status === "initiated" ||
            status === "processing") {
            // Gateway failures / rate limits after submit may still have executed.
            return {
                ok: false,
                status: "pending",
                providerRef: ref,
                message: message || `VTpass HTTP ${http}`,
                raw: data,
                ambiguous: true,
            };
        }
        return {
            ok: false,
            status: "failed",
            providerRef: ref,
            message: message || "VTpass failed",
            raw: data,
        };
    }
    function networkError(err) {
        return {
            ok: false,
            status: "failed",
            message: err instanceof Error ? err.message : "VTpass network error",
            // A timeout/abort after submit may still have executed server-side.
            ambiguous: isTimeout(err) ? true : undefined,
        };
    }
    async function verify(serviceID, billersCode, type) {
        try {
            const { http, data } = await post(paths.verify, {
                ...(type ? { type } : {}),
                billersCode,
                serviceID,
            });
            const code = String(data.code ?? "");
            const content = (data.content ?? {});
            if (code === "000") {
                const name = content.Customer_Name ?? content.customer_name ?? content.name;
                return {
                    ok: true,
                    status: "success",
                    customerName: typeof name === "string" ? name : undefined,
                    message: String(data.response_description ?? "Verified"),
                    raw: data,
                };
            }
            return {
                ok: false,
                status: "failed",
                message: String(data.response_description ?? `VTpass HTTP ${http}`) ||
                    "Verification failed",
                raw: data,
            };
        }
        catch (err) {
            // Validation moves no money — plain failure, router may try next.
            return {
                ok: false,
                status: "failed",
                message: err instanceof Error ? err.message : "VTpass network error",
            };
        }
    }
    return {
        id: "vtpass",
        domains: ["airtime", "electricity", "cable", "exampin"],
        async buyAirtime(a) {
            try {
                const serviceID = AIRTIME_SERVICE_IDS[a.network];
                if (!serviceID) {
                    return {
                        ok: false,
                        status: "failed",
                        message: `VTpass has no airtime service for ${a.network}`,
                    };
                }
                const { http, data } = await post(paths.pay, {
                    request_id: vtpassRequestId(a.idempotencyKey),
                    serviceID,
                    amount: a.amount,
                    phone: a.phone,
                });
                const result = mapPay(http, data, a.idempotencyKey);
                return result.ok ? { ...result, priceNgn: a.amount } : result;
            }
            catch (err) {
                return networkError(err);
            }
        },
        async validateMeter(v) {
            const serviceID = discoIds[v.disco.toUpperCase()];
            if (!serviceID) {
                return {
                    ok: false,
                    status: "failed",
                    message: `VTpass has no service for disco ${v.disco}`,
                };
            }
            return verify(serviceID, v.meter, v.meterType ?? "prepaid");
        },
        async buyElectricity(a) {
            try {
                const serviceID = discoIds[a.disco.toUpperCase()];
                if (!serviceID) {
                    return {
                        ok: false,
                        status: "failed",
                        message: `VTpass has no service for disco ${a.disco}`,
                    };
                }
                const meterType = a.meterType ?? "prepaid";
                const { http, data } = await post(paths.pay, {
                    request_id: vtpassRequestId(a.idempotencyKey),
                    serviceID,
                    billersCode: a.meter,
                    variation_code: meterType,
                    amount: a.amount,
                    ...(a.phone ? { phone: a.phone } : {}),
                });
                const result = mapPay(http, data, a.idempotencyKey);
                return result.ok ? { ...result, priceNgn: a.amount } : result;
            }
            catch (err) {
                return networkError(err);
            }
        },
        async validateIUC(v) {
            const serviceID = cableIds[v.biller.toUpperCase()];
            if (!serviceID) {
                return {
                    ok: false,
                    status: "failed",
                    message: `VTpass has no service for biller ${v.biller}`,
                };
            }
            return verify(serviceID, v.smartCard);
        },
        async buyCable(a) {
            try {
                const biller = a.biller.toUpperCase();
                const serviceID = cableIds[biller];
                if (!serviceID) {
                    return {
                        ok: false,
                        status: "failed",
                        message: `VTpass has no service for biller ${a.biller}`,
                    };
                }
                const resolved = await resolveVariation({
                    serviceID,
                    packageKey: `${biller}:${a.packageCode.toUpperCase()}`,
                    packageCode: a.packageCode,
                    defaultCode: null,
                    amount: a.amount,
                });
                if (!resolved) {
                    return {
                        ok: false,
                        status: "failed",
                        message: `VTpass has no ${a.packageCode} variation on ${serviceID}`,
                    };
                }
                if (resolved.livePrice != null && resolved.livePrice > a.amount) {
                    return {
                        ok: false,
                        status: "failed",
                        message: `VTpass price ₦${resolved.livePrice} exceeds charged ₦${a.amount}`,
                    };
                }
                const { http, data } = await post(paths.pay, {
                    request_id: vtpassRequestId(a.idempotencyKey),
                    serviceID,
                    billersCode: a.smartCard,
                    variation_code: resolved.code,
                    amount: resolved.livePrice ?? a.amount,
                    ...(a.phone ? { phone: a.phone } : {}),
                    subscription_type: "change",
                });
                const result = mapPay(http, data, a.idempotencyKey);
                return result.ok
                    ? { ...result, priceNgn: resolved.livePrice ?? a.amount }
                    : result;
            }
            catch (err) {
                return networkError(err);
            }
        },
        async buyExamPin(a) {
            try {
                const biller = a.biller.toUpperCase();
                const product = examProducts[biller];
                if (!product) {
                    return {
                        ok: false,
                        status: "failed",
                        message: `VTpass has no exam product for ${a.biller}`,
                    };
                }
                const qty = Math.max(1, Math.floor(a.quantity));
                const resolved = await resolveVariation({
                    serviceID: product.serviceID,
                    packageKey: null,
                    packageCode: null,
                    defaultCode: product.defaultVariation,
                    amount: null,
                });
                if (!resolved) {
                    return {
                        ok: false,
                        status: "failed",
                        message: `VTpass has no ${biller} variation available`,
                    };
                }
                if (resolved.livePrice != null && resolved.livePrice * qty > a.amount) {
                    return {
                        ok: false,
                        status: "failed",
                        message: `VTpass price ₦${resolved.livePrice} × ${qty} exceeds charged ₦${a.amount}`,
                    };
                }
                const { http, data } = await post(paths.pay, {
                    request_id: vtpassRequestId(a.idempotencyKey),
                    serviceID: product.serviceID,
                    variation_code: resolved.code,
                    amount: resolved.livePrice ?? a.amount,
                    quantity: qty,
                    ...(a.phone ? { phone: a.phone } : {}),
                });
                const result = mapPay(http, data, a.idempotencyKey);
                return result.ok
                    ? {
                        ...result,
                        priceNgn: resolved.livePrice != null ? resolved.livePrice * qty : a.amount,
                    }
                    : result;
            }
            catch (err) {
                return networkError(err);
            }
        },
        async getStatus(providerRef) {
            try {
                const { data } = await post(paths.requery, { request_id: providerRef });
                const code = String(data.code ?? "");
                const status = String(txOf(data).status ?? "").toLowerCase();
                if (code === "000" && status === "delivered") {
                    return { status: "success", message: "delivered", raw: data };
                }
                if (status === "pending" ||
                    status === "initiated" ||
                    status === "processing") {
                    return { status: "pending", message: "still pending", raw: data };
                }
                return {
                    status: "failed",
                    message: String(data.response_description ?? "requery failed"),
                    raw: data,
                };
            }
            catch (err) {
                return {
                    status: "unknown",
                    message: err instanceof Error ? err.message : "requery error",
                };
            }
        },
    };
}
//# sourceMappingURL=vtpass.js.map