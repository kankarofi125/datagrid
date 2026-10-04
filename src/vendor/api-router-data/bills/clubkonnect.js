/**
 * ClubKonnect (Nellobytes) bills adapter — airtime, electricity, cable.
 *
 * GET endpoints with UserID/APIKey query auth (ported from the previously
 * live webapp adapter):
 * - /APIAirtimeV1.asp {MobileNetwork, Amount, MobileNumber, RequestID}
 * - /APIElectricityV1.asp {ElectricCompany, MeterNo, Amount, RequestID}
 * - /APICableTVV1.asp {CableTV, SmartCardNo, Package, RequestID}
 * - Success: status ORDER_RECEIVED/successful or statuscode "200".
 *
 * No exam pins, no meter/IUC validation, no documented requery.
 */
function joinUrl(base, path) {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
export function createClubKonnectAdapter(config, fetchFn) {
    const baseUrl = config.baseUrl;
    const timeoutMs = config.timeoutMs ?? 15000;
    const fetchImpl = fetchFn ?? fetch;
    const paths = {
        airtime: config.paths?.airtime ?? "/APIAirtimeV1.asp",
        electricity: config.paths?.electricity ?? "/APIElectricityV1.asp",
        cable: config.paths?.cable ?? "/APICableTVV1.asp",
    };
    const discoValues = config.discoValues ?? {};
    const cableValues = config.cableValues ?? {};
    const networkValues = {
        mtn: "MTN",
        glo: "GLO",
        airtel: "AIRTEL",
        "9mobile": "9MOBILE",
        ...config.networkValues,
    };
    function isTimeout(err) {
        return (err instanceof Error &&
            (err.name === "AbortError" ||
                err.name === "TimeoutError" ||
                /abort|timeout/i.test(err.message)));
    }
    async function ckGet(path, params) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const q = new URLSearchParams({
                UserID: config.userId ?? "",
                APIKey: config.apiKey ?? "",
                ...params,
            });
            const res = await fetchImpl(`${joinUrl(baseUrl, path)}?${q.toString()}`, {
                signal: ctrl.signal,
            });
            const data = (await res.json().catch(() => ({})));
            const status = String(data.status ?? "");
            const ok = status === "ORDER_RECEIVED" ||
                status === "successful" ||
                String(data.statuscode ?? "") === "200";
            if (ok) {
                const ref = data.orderid ?? data.orderno ?? data.transactionid;
                const token = data.token ?? data.pin;
                const name = data.customer_name;
                return {
                    ok: true,
                    status: "success",
                    providerRef: ref != null ? String(ref) : undefined,
                    token: token != null ? String(token) : undefined,
                    customerName: typeof name === "string" ? name : undefined,
                    message: status || undefined,
                    raw: data,
                };
            }
            return {
                ok: false,
                status: "failed",
                message: status || String(data.message ?? "ClubKonnect failed"),
                raw: data,
            };
        }
        catch (err) {
            return {
                ok: false,
                status: "failed",
                message: err instanceof Error ? err.message : "ClubKonnect network error",
                ambiguous: isTimeout(err) ? true : undefined,
            };
        }
        finally {
            clearTimeout(t);
        }
    }
    const notSupported = (what) => ({
        ok: false,
        status: "failed",
        message: `ClubKonnect does not serve ${what}`,
    });
    return {
        id: "clubkonnect",
        domains: ["airtime", "electricity", "cable"],
        async buyAirtime(a) {
            const r = await ckGet(paths.airtime, {
                MobileNetwork: networkValues[a.network] ?? a.network.toUpperCase(),
                Amount: String(a.amount),
                MobileNumber: a.phone,
                RequestID: a.idempotencyKey.slice(0, 40),
            });
            return r.ok ? { ...r, priceNgn: a.amount } : r;
        },
        async validateMeter(_v) {
            return notSupported("meter validation");
        },
        async buyElectricity(a) {
            const r = await ckGet(paths.electricity, {
                ElectricCompany: discoValues[a.disco.toUpperCase()] ?? a.disco.toUpperCase(),
                MeterNo: a.meter,
                Amount: String(a.amount),
                RequestID: a.idempotencyKey.slice(0, 40),
            });
            return r.ok ? { ...r, priceNgn: a.amount } : r;
        },
        async validateIUC(_v) {
            return notSupported("IUC validation");
        },
        async buyCable(a) {
            const r = await ckGet(paths.cable, {
                CableTV: cableValues[a.biller.toUpperCase()] ?? a.biller.toUpperCase(),
                SmartCardNo: a.smartCard,
                Package: a.packageCode,
                RequestID: a.idempotencyKey.slice(0, 40),
            });
            return r.ok ? { ...r, priceNgn: a.amount } : r;
        },
        async buyExamPin(_a) {
            return notSupported("exam pins");
        },
        async getStatus(_providerRef) {
            return { status: "unknown", message: "ClubKonnect has no requery endpoint" };
        },
    };
}
//# sourceMappingURL=clubkonnect.js.map