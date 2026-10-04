/**
 * VTpass bills adapter — airtime, electricity, cable/Showmax, WAEC pins.
 *
 * Shapes follow https://vtpass.com/documentation/ (verified 2026-10-04):
 * - POST /pay {request_id, serviceID, billersCode?, variation_code?, amount?, phone?, quantity?, subscription_type?}
 * - POST /merchant-verify {billersCode, serviceID, type?}
 * - POST /api/requery {request_id}
 * - GET /service-variations?serviceID=X
 * - Success: code "000" + content.transactions.status "delivered".
 *
 * Auth: `api-key` + `secret-key` headers.
 */
import type { BillsProviderAdapter, BillsVtpassConfig } from "./types.js";
/**
 * VTpass request_id rule (docs: "How to generate Request ID"): ≥12 chars,
 * first 12 numeric as YYYYMMDDHHII in Africa/Lagos. Derived deterministically
 * from the idempotency key so retries reuse the provider reference.
 */
export declare function vtpassRequestId(idempotencyKey: string, now?: Date): string;
export declare function createVtpassAdapter(config: BillsVtpassConfig, fetchFn?: typeof fetch): BillsProviderAdapter;
//# sourceMappingURL=vtpass.d.ts.map