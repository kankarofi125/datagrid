import { MsorgClient } from "./msorg.js";
/**
 * Confirmed on the logged-in documentation page and on plan.network
 * from GET /api/user/ (2026-09-25). Not the 1/2/3/4 order used by some
 * other MSORG clones.
 */
export const ALRAHUZ_NETWORK_IDS = {
    mtn: 1,
    glo: 2,
    "9mobile": 3,
    airtel: 4,
};
export function createAlrahuzAdapter(config, fetchFn) {
    return new MsorgClient({
        ...config,
        providerId: "alrahuz",
        fetchFn,
        networkIds: { ...ALRAHUZ_NETWORK_IDS, ...config.networkIds },
        paths: {
            listPlans: "/api/user/",
            purchase: "/api/data/",
            status: "/api/data/{ref}",
            ...config.paths,
        },
    });
}
//# sourceMappingURL=alrahuz.js.map