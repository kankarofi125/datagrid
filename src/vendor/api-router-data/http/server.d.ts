import http from "node:http";
import { type DataRouter } from "../index.js";
import { type BillsRouter } from "../index.js";
import type { RouterConfig } from "../types.js";
import type { BillsRouterConfig } from "../bills/types.js";
export declare function createHttpServer(router: DataRouter, bills: BillsRouter | null): http.Server;
export declare function startServer(config: RouterConfig, opts?: {
    port?: number;
    host?: string;
    bills?: BillsRouterConfig;
}): {
    server: http.Server;
    router: DataRouter;
    bills: BillsRouter | null;
    port: number;
};
//# sourceMappingURL=server.d.ts.map