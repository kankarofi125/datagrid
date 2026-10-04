import { createVtpassAdapter } from "./vtpass.js";
import { createClubKonnectAdapter } from "./clubkonnect.js";
/** Default failover order. VTpass documents every domain it serves. */
export const BILLS_FAILOVER_ORDER = ["vtpass", "clubkonnect"];
export function buildBillsRegistry(config) {
    const map = new Map();
    const fetchFn = config.fetchFn;
    if (config.providers.vtpass?.enabled && config.providers.vtpass.baseUrl) {
        map.set("vtpass", createVtpassAdapter(config.providers.vtpass, fetchFn));
    }
    if (config.providers.clubkonnect?.enabled &&
        config.providers.clubkonnect.baseUrl) {
        map.set("clubkonnect", createClubKonnectAdapter(config.providers.clubkonnect, fetchFn));
    }
    return map;
}
export function billsFailoverOrder(config, registry) {
    const order = config.order ?? BILLS_FAILOVER_ORDER;
    return order.filter((id) => registry.has(id));
}
//# sourceMappingURL=registry.js.map