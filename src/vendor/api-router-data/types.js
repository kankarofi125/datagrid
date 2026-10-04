/**
 * Shared domain types for the VTU data routing engine.
 */
export class RouterError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "RouterError";
    }
}
//# sourceMappingURL=types.js.map