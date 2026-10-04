import type { Network, NormalizedPlanKey, ProductType, ProviderPlan } from "../types.js";
/**
 * Parse human size labels into megabytes.
 * 1GB = 1024 MB (binary convention common in Nigerian VTU tables).
 */
export declare function parseSizeToMb(size: string | number): number;
export declare function formatSizeMb(sizeMb: number): string;
export declare function normalizeNetwork(raw: string | number): Network;
export declare function normalizeProductType(raw: string | undefined | null): ProductType;
/** Best-effort from free-text plan labels (SME, C.G, etc.). */
export declare function inferProductTypeFromLabel(label: string): ProductType;
export declare function planKey(plan: NormalizedPlanKey): string;
export declare function toNormalizedKey(network: Network | string, size: string | number, validityDays: number, productType: ProductType | string): NormalizedPlanKey;
export declare function matchesPlan(a: Pick<ProviderPlan, "network" | "sizeMb" | "validityDays" | "productType">, b: NormalizedPlanKey): boolean;
/**
 * Validity buckets: treat 21–31 day "monthly" rows as matching requested 30
 * when both are in the monthly band — but only for equality within same band.
 * For routing we require exact validityDays from the quote request; catalogs
 * should expose the day value they advertise. Helpers below aid adapters.
 */
export declare function parseValidityDays(raw: string | number | undefined): number;
//# sourceMappingURL=normalize.d.ts.map