import type { Network, ProviderConfigBase } from "../types.js";
import { MsorgClient } from "./msorg.js";
/**
 * Confirmed on the logged-in documentation page and on plan.network
 * from GET /api/user/ (2026-09-25). Not the 1/2/3/4 order used by some
 * other MSORG clones.
 */
export declare const ALRAHUZ_NETWORK_IDS: Record<Network, number>;
export declare function createAlrahuzAdapter(config: ProviderConfigBase, fetchFn?: typeof fetch): MsorgClient;
//# sourceMappingURL=alrahuz.d.ts.map