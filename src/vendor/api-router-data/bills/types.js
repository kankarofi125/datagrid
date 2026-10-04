/**
 * Bills + airtime domain types for the VTU routing engine.
 *
 * DATA keeps its price-aware catalog router (see ../types.ts). The domains
 * here are face-value products (airtime, meter/subscription payments) routed
 * by ordered failover across the wholesalers that stock them.
 */
export class BillsRouterError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "BillsRouterError";
    }
}
//# sourceMappingURL=types.js.map