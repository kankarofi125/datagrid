import http from "node:http";
import { createRouter } from "../index.js";
import { createBillsRouter } from "../index.js";
import { handleRequest } from "./routes.js";
function envFlag(k) {
    return process.env[k] === "1" || process.env[k] === "true";
}
function pathsFromEnv(prefix) {
    const listPlans = process.env[`${prefix}_LIST_PATH`];
    const purchase = process.env[`${prefix}_PURCHASE_PATH`];
    const status = process.env[`${prefix}_STATUS_PATH`];
    if (!listPlans && !purchase && !status)
        return undefined;
    return {
        listPlans: listPlans || undefined,
        purchase: purchase || undefined,
        status: status || undefined,
    };
}
function authFromEnv(k) {
    const v = process.env[k];
    if (v === "bearer" || v === "token" || v === "raw")
        return v;
    return undefined;
}
function providerFromEnv(enabledKey, baseKey, tokenKey, prefix, defaultBase = "", extra) {
    return {
        enabled: envFlag(enabledKey),
        baseUrl: process.env[baseKey] || defaultBase,
        apiToken: process.env[tokenKey],
        paths: pathsFromEnv(prefix),
        authScheme: authFromEnv(`${prefix}_AUTH`),
        ...extra,
    };
}
export function createHttpServer(router, bills) {
    return http.createServer((req, res) => {
        void handleRequest(router, bills, req, res);
    });
}
export function startServer(config, opts) {
    const router = createRouter(config);
    const bills = opts?.bills ? createBillsRouter(opts.bills) : null;
    const server = createHttpServer(router, bills);
    const port = opts?.port ?? Number(process.env.PORT ?? 8787);
    const host = opts?.host ?? "0.0.0.0";
    server.listen(port, host);
    return { server, router, bills, port };
}
/** Explicit *_ENABLED flag wins, otherwise present credentials activate. */
function billsProviderOn(flagKey, ...tokenKeys) {
    const raw = (process.env[flagKey] ?? "").trim().toLowerCase();
    if (raw === "1" || raw === "true")
        return true;
    if (raw === "0" || raw === "false")
        return false;
    return tokenKeys.some((k) => Boolean(process.env[k]?.trim()));
}
/** Bills router env (VTpass + ClubKonnect). Datails in README. */
function loadBillsConfigFromEnv() {
    const timeoutMs = Number(process.env.BILLS_TIMEOUT_MS ?? process.env.ROUTER_DATA_TIMEOUT_MS ?? "15000");
    return {
        providers: {
            vtpass: {
                enabled: billsProviderOn("VTPASS_BILLS_ENABLED", "VTPASS_API_KEY", "VTPASS_SECRET_KEY"),
                baseUrl: process.env.VTPASS_BASE_URL?.trim() || "https://vtpass.com/api",
                apiKey: process.env.VTPASS_API_KEY?.trim() || undefined,
                secretKey: process.env.VTPASS_SECRET_KEY?.trim() || undefined,
                timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000,
            },
            clubkonnect: {
                enabled: billsProviderOn("CLUBKONNECT_BILLS_ENABLED", "CLUBKONNECT_USER_ID", "CLUBKONNECT_API_KEY"),
                baseUrl: process.env.CLUBKONNECT_BASE_URL?.trim() ||
                    "https://www.nellobytesystems.com",
                userId: process.env.CLUBKONNECT_USER_ID?.trim() || undefined,
                apiKey: process.env.CLUBKONNECT_API_KEY?.trim() || undefined,
                timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000,
            },
        },
    };
}
function loadConfigFromEnv() {
    const gsubzServices = process.env.GSUBZ_SERVICES?.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return {
        providers: {
            alrahuz: providerFromEnv("ALRAHUZ_ENABLED", "ALRAHUZ_BASE_URL", "ALRAHUZ_TOKEN", "ALRAHUZ", "https://alrahuzdata.com.ng"),
            gladtidings: providerFromEnv("GLADTIDINGS_ENABLED", "GLADTIDINGS_BASE_URL", "GLADTIDINGS_TOKEN", "GLADTIDINGS", "https://www.gladtidingsdata.com"),
            easyaccess: providerFromEnv("EASYACCESS_ENABLED", "EASYACCESS_BASE_URL", "EASYACCESS_TOKEN", "EASYACCESS", "https://easyaccessapi.com.ng"),
            datagifting: {
                enabled: envFlag("DATAGIFTING_ENABLED"),
                baseUrl: process.env.DATAGIFTING_BASE_URL ?? "https://v6.datagifting.com.ng",
                apiKey: process.env.DATAGIFTING_API_KEY,
            },
            gsubz: providerFromEnv("GSUBZ_ENABLED", "GSUBZ_BASE_URL", "GSUBZ_API_KEY", "GSUBZ", "https://api.gsubz.com", {
                apiKey: process.env.GSUBZ_API_KEY,
                services: gsubzServices,
            }),
            semz: providerFromEnv("SEMZ_ENABLED", "SEMZ_BASE_URL", "SEMZ_TOKEN", "SEMZ", "https://semzdata.com.ng"),
            peyflex: providerFromEnv("PEYFLEX_ENABLED", "PEYFLEX_BASE_URL", "PEYFLEX_TOKEN", "PEYFLEX", "https://client.peyflex.com.ng"),
        },
    };
}
const isMain = typeof process !== "undefined" &&
    process.argv[1] &&
    (process.argv[1].endsWith("server.js") ||
        process.argv[1].endsWith("server.ts"));
if (isMain) {
    const { port } = startServer(loadConfigFromEnv(), {
        bills: loadBillsConfigFromEnv(),
    });
    console.log(`api-router-data listening on :${port}`);
}
//# sourceMappingURL=server.js.map