/**
 * Bills + airtime domain types for the VTU routing engine.
 *
 * DATA keeps its price-aware catalog router (see ../types.ts). The domains
 * here are face-value products (airtime, meter/subscription payments) routed
 * by ordered failover across the wholesalers that stock them.
 */
import type { Network } from "../types.js";
export type BillsProviderId = "vtpass" | "clubkonnect";
export type BillDomain = "airtime" | "electricity" | "cable" | "exampin";
export type BillStatus = "success" | "pending" | "failed" | "unknown";
export interface BillAdapterResult {
    ok: boolean;
    status: BillStatus;
    providerRef?: string;
    /** Electricity token / generic delivered code. */
    token?: string;
    /** Exam pins, one entry per pin. */
    pins?: string[];
    customerName?: string;
    /** What the wholesaler actually charged (Naira). */
    priceNgn?: number;
    message?: string;
    raw?: unknown;
    /**
     * True when the wholesaler may have executed the order (timeout / 5xx
     * after submit, or an explicit pending). The router must NOT fail over
     * in this case — the caller requeries instead.
     */
    ambiguous?: boolean;
}
export interface AirtimeArgs {
    network: Network;
    phone: string;
    amount: number;
    idempotencyKey: string;
}
export type MeterType = "prepaid" | "postpaid";
export interface MeterArgs {
    /** Canonical disco code, e.g. IKEDC, EKEDC, AEDC. */
    disco: string;
    meter: string;
    meterType?: MeterType;
}
export interface ElectricityArgs extends MeterArgs {
    amount: number;
    phone?: string;
    idempotencyKey: string;
}
export interface IucArgs {
    /** Canonical biller code, e.g. DSTV, GOTV, STARTIMES, SHOWMAX. */
    biller: string;
    smartCard: string;
}
export interface CableArgs extends IucArgs {
    /** Webapp package code, e.g. PADI, JOLLI, NOVA, MOBILE. */
    packageCode: string;
    /** Amount charged to the wallet. */
    amount: number;
    phone?: string;
    idempotencyKey: string;
}
export interface ExamPinArgs {
    /** Canonical biller code, e.g. WAEC. */
    biller: string;
    quantity: number;
    /** Total amount charged to the wallet (margin guard). */
    amount: number;
    phone?: string;
    idempotencyKey: string;
}
export interface BillsProviderAdapter {
    readonly id: BillsProviderId;
    /** Domains this adapter can serve. Others return not_supported. */
    readonly domains: BillDomain[];
    buyAirtime(a: AirtimeArgs): Promise<BillAdapterResult>;
    validateMeter(v: MeterArgs): Promise<BillAdapterResult>;
    buyElectricity(a: ElectricityArgs): Promise<BillAdapterResult>;
    validateIUC(v: IucArgs): Promise<BillAdapterResult>;
    buyCable(a: CableArgs): Promise<BillAdapterResult>;
    buyExamPin(a: ExamPinArgs): Promise<BillAdapterResult>;
    getStatus(providerRef: string): Promise<{
        status: BillStatus;
        message?: string;
        raw?: unknown;
    }>;
}
export interface BillAttempt {
    providerId: BillsProviderId;
    ok: boolean;
    status: BillStatus;
    message?: string;
    providerRef?: string;
}
export interface BillOrderResult {
    ok: boolean;
    providerId?: BillsProviderId;
    providerRef?: string;
    status: BillStatus;
    /** What the wholesaler actually charged (Naira). */
    priceNgn?: number;
    token?: string;
    pins?: string[];
    customerName?: string;
    message?: string;
    attempts?: BillAttempt[];
    /** True when served from the idempotency store. */
    idempotentReplay?: boolean;
    /** Internal: when an in-progress reservation was placed (lease checks). */
    reservedAt?: number;
}
export interface BillsRouterConfig {
    providers: {
        vtpass?: BillsVtpassConfig;
        clubkonnect?: BillsClubKonnectConfig;
    };
    /** Failover order. Default: ["vtpass", "clubkonnect"]. */
    order?: BillsProviderId[];
    /** Override fetch for tests. */
    fetchFn?: typeof fetch;
}
export interface BillsProviderConfigBase {
    enabled: boolean;
    baseUrl: string;
    timeoutMs?: number;
    /** Override fetch for tests. */
    fetchFn?: typeof fetch;
}
export interface BillsVtpassConfig extends BillsProviderConfigBase {
    apiKey?: string;
    secretKey?: string;
    /** Canonical disco code → VTpass serviceID. */
    discoServiceIds?: Record<string, string>;
    /** Canonical biller code → VTpass serviceID. */
    cableServiceIds?: Record<string, string>;
    /** "BILLER:PACKAGE" → VTpass variation_code. */
    packageCodes?: Record<string, string>;
    /** Canonical exam biller → VTpass serviceID + default variation. */
    examServiceIds?: Record<string, {
        serviceID: string;
        defaultVariation: string;
    }>;
    paths?: {
        pay?: string;
        verify?: string;
        requery?: string;
        variations?: string;
    };
}
export interface BillsClubKonnectConfig extends BillsProviderConfigBase {
    userId?: string;
    apiKey?: string;
    /** Engine network → Nellobytes MobileNetwork value. */
    networkValues?: Partial<Record<string, string>>;
    /** Canonical disco code → Nellobytes ElectricCompany value. */
    discoValues?: Record<string, string>;
    /** Canonical biller code → Nellobytes CableTV value. */
    cableValues?: Record<string, string>;
    paths?: {
        airtime?: string;
        electricity?: string;
        cable?: string;
    };
}
export declare class BillsRouterError extends Error {
    readonly code: string;
    readonly details?: unknown | undefined;
    constructor(message: string, code: string, details?: unknown | undefined);
}
//# sourceMappingURL=types.d.ts.map