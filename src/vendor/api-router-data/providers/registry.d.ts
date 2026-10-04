import type { ProviderId, RouterConfig } from "../types.js";
import type { DataProviderAdapter } from "./types.js";
/**
 * Tie-break when prices are equal (index 0 = most preferred).
 * DataGifting is intentionally absent: it stays in the registry but is
 * disabled by default and loses ties (rank 999) if someone turns it on.
 */
export declare const TIE_BREAK_ORDER: ProviderId[];
export declare function tieBreakRank(id: ProviderId): number;
export declare function buildProviderRegistry(config: RouterConfig): Map<ProviderId, DataProviderAdapter>;
export declare function configuredProviderIds(config: RouterConfig): ProviderId[];
//# sourceMappingURL=registry.d.ts.map