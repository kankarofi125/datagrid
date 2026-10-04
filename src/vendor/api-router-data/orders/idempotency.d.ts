import type { PurchaseResult } from "../types.js";
/**
 * In-memory idempotency store. Production apps should replace with Redis/DB
 * via a custom store implementing IdempotencyStore.
 */
export interface IdempotencyStore {
    get(key: string): Promise<PurchaseResult | undefined>;
    set(key: string, value: PurchaseResult): Promise<void>;
    /**
     * Atomic set-if-absent. Returns true when this caller stored the value,
     * false when a value already exists. Implementations backed by Redis/DB
     * should use SET NX / upsert-with-unique-key semantics. Used to reserve a
     * key while a purchase is in flight; only final outcomes should be stored.
     */
    setIfAbsent(key: string, value: PurchaseResult): Promise<boolean>;
    /** Release a reservation (definitive failure / crash recovery). */
    delete(key: string): Promise<void>;
}
export declare class MemoryIdempotencyStore implements IdempotencyStore {
    private map;
    get(key: string): Promise<PurchaseResult | undefined>;
    set(key: string, value: PurchaseResult): Promise<void>;
    setIfAbsent(key: string, value: PurchaseResult): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(): void;
}
//# sourceMappingURL=idempotency.d.ts.map