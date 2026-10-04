import type { IncomingMessage, ServerResponse } from "node:http";
import type { DataRouter } from "../index.js";
import type { BillsRouter } from "../index.js";
export declare function handleRequest(router: DataRouter, bills: BillsRouter | null, req: IncomingMessage, res: ServerResponse): Promise<void>;
//# sourceMappingURL=routes.d.ts.map