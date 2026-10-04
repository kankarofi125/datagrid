import type { OrderStatus, ProviderId, ProviderPlan, PurchaseRequest, StatusResult } from "../types.js";
export interface PurchaseAdapterResult {
    ok: boolean;
    status: OrderStatus;
    providerRef?: string;
    message?: string;
    raw?: unknown;
    /**
     * True when the outcome is unknown — e.g. timeout or 5xx after the request
     * may have been processed. The engine must NOT fail over to another provider
     * in this case (risk of double purchase); caller should requery status.
     */
    ambiguous?: boolean;
}
export interface DataProviderAdapter {
    readonly id: ProviderId;
    /** Fetch / refresh catalog plans. */
    listPlans(): Promise<ProviderPlan[]>;
    /** Purchase a specific plan code. */
    purchase(args: {
        planCode: string;
        phone: string;
        network: PurchaseRequest["network"];
        productType: PurchaseRequest["productType"];
        idempotencyKey: string;
        sizeMb: number;
        validityDays: number;
    }): Promise<PurchaseAdapterResult>;
    /** Requery by provider reference. */
    getStatus(providerRef: string): Promise<StatusResult>;
}
//# sourceMappingURL=types.d.ts.map