import type { Network, ProviderConfigBase } from "../types.js";
import { MsorgClient } from "./msorg.js";
/**
 * plan.network on GET /api/user/ for the connected Smart Earner account,
 * 2026-10-04. This is not the Alrahuz map and not the older clone order.
 * 9mobile 6 was on the plans whose plan_network is 9MOBILE. The long
 * 9MOBILE_PLAN lists were Airtel rows (network 3) copied into every bucket.
 */
export declare const GLADTIDINGS_NETWORK_IDS: Record<Network, number>;
/**
 * Same MSORG path shape as Alrahuz (catalog on GET /api/user/, buy on
 * POST /api/data/, requery on GET /api/data/<id>).
 */
export declare function createGladtidingsAdapter(config: ProviderConfigBase, fetchFn?: typeof fetch): MsorgClient;
//# sourceMappingURL=gladtidings.d.ts.map