import { MsorgClient } from "./msorg.js";
/**
 * plan.network on GET /api/user/ for the connected Smart Earner account,
 * 2026-10-04. This is not the Alrahuz map and not the older clone order.
 * 9mobile 6 was on the plans whose plan_network is 9MOBILE. The long
 * 9MOBILE_PLAN lists were Airtel rows (network 3) copied into every bucket.
 */
export const GLADTIDINGS_NETWORK_IDS = {
    mtn: 1,
    glo: 2,
    airtel: 3,
    "9mobile": 6,
};
/**
 * Same MSORG path shape as Alrahuz (catalog on GET /api/user/, buy on
 * POST /api/data/, requery on GET /api/data/<id>).
 */
export function createGladtidingsAdapter(config, fetchFn) {
    return new MsorgClient({
        ...config,
        providerId: "gladtidings",
        fetchFn,
        networkIds: { ...GLADTIDINGS_NETWORK_IDS, ...config.networkIds },
        paths: {
            listPlans: "/api/user/",
            purchase: "/api/data/",
            status: "/api/data/{ref}",
            ...config.paths,
        },
    });
}
//# sourceMappingURL=gladtidings.js.map