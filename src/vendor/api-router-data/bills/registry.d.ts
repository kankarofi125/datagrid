import type { BillsProviderAdapter, BillsProviderId, BillsRouterConfig } from "./types.js";
/** Default failover order. VTpass documents every domain it serves. */
export declare const BILLS_FAILOVER_ORDER: BillsProviderId[];
export declare function buildBillsRegistry(config: BillsRouterConfig): Map<BillsProviderId, BillsProviderAdapter>;
export declare function billsFailoverOrder(config: BillsRouterConfig, registry: Map<BillsProviderId, BillsProviderAdapter>): BillsProviderId[];
//# sourceMappingURL=registry.d.ts.map