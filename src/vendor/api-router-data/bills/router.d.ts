/**
 * Ordered-failover router for airtime + bills.
 *
 * Unlike DATA there is no catalog price matching here: airtime/electricity
 * are face-value products, cable/exam pins resolve their variation at the
 * adapter. The router guarantees at-most-once execution per idempotency key
 * and never fails over after an ambiguous outcome.
 */
import type { AirtimeArgs, BillAdapterResult, BillOrderResult, BillsProviderAdapter, BillsProviderId, BillsRouterConfig, BillStatus, CableArgs, ElectricityArgs, ExamPinArgs, IucArgs, MeterArgs } from "./types.js";
import type { BillsIdempotencyStore } from "./idempotency.js";
export declare class BillsRouterEngine {
    private readonly adapters;
    private readonly idempotency;
    private readonly config;
    constructor(config: BillsRouterConfig, adapters?: Map<BillsProviderId, BillsProviderAdapter>, idempotency?: BillsIdempotencyStore);
    private eligible;
    private reserve;
    private buy;
    private validate;
    buyAirtime(a: AirtimeArgs): Promise<BillOrderResult>;
    validateMeter(v: MeterArgs): Promise<BillAdapterResult>;
    buyElectricity(a: ElectricityArgs): Promise<BillOrderResult>;
    validateIUC(v: IucArgs): Promise<BillAdapterResult>;
    buyCable(a: CableArgs): Promise<BillOrderResult>;
    buyExamPin(a: ExamPinArgs): Promise<BillOrderResult>;
    getStatus(providerId: BillsProviderId, providerRef: string): Promise<{
        status: BillStatus;
        message?: string;
        raw?: unknown;
    }>;
}
export interface BillsRouter {
    buyAirtime(a: AirtimeArgs): Promise<BillOrderResult>;
    validateMeter(v: MeterArgs): Promise<BillAdapterResult>;
    buyElectricity(a: ElectricityArgs): Promise<BillOrderResult>;
    validateIUC(v: IucArgs): Promise<BillAdapterResult>;
    buyCable(a: CableArgs): Promise<BillOrderResult>;
    buyExamPin(a: ExamPinArgs): Promise<BillOrderResult>;
    getStatus(providerId: BillsProviderId, providerRef: string): Promise<{
        status: BillStatus;
        message?: string;
        raw?: unknown;
    }>;
    engine: BillsRouterEngine;
}
export declare function createBillsRouter(config: BillsRouterConfig, opts?: {
    idempotency?: BillsIdempotencyStore;
}): BillsRouter;
//# sourceMappingURL=router.d.ts.map