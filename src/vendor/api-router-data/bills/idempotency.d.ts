import type { BillOrderResult } from "./types.js";
/**
 * In-memory idempotency store for bills orders. Same contract as the DATA
 * store: reserve with setIfAbsent before side effects, persist final
 * outcomes, release on definitive failure. Production multi-instance
 * deployments should replace this with Redis/DB.
 */
export interface BillsIdempotencyStore {
    get(key: string): Promise<BillOrderResult | undefined>;
    set(key: string, value: BillOrderResult): Promise<void>;
    setIfAbsent(key: string, value: BillOrderResult): Promise<boolean>;
    delete(key: string): Promise<void>;
}
export declare class MemoryBillsIdempotencyStore implements BillsIdempotencyStore {
    private map;
    get(key: string): Promise<BillOrderResult | undefined>;
    set(key: string, value: BillOrderResult): Promise<void>;
    setIfAbsent(key: string, value: BillOrderResult): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(): void;
}
//# sourceMappingURL=idempotency.d.ts.map