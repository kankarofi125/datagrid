/**
 * SemzData adapter.
 *
 * No confirmed API document was found, and on 2026-09-25 none of these
 * hosts resolved: semzdata.com.ng, semzdata.com, semzdata.ng, semz.com.ng.
 * A search index still showed an old https://semzdata.com.ng/pricing/ page.
 * That page is not live and its numbers are not used.
 *
 * This adapter is the shared MSORG client with overridable baseUrl + paths.
 * Those paths are the Alrahuz/Gladtidings convention (see msorg.ts). They
 * are NOT a Semz official spec. Leave the provider disabled until a hostname
 * resolves and a logged-in plan list is compared with Gsubz (see RESEARCH.md).
 */
import type { ProviderConfigBase } from "../types.js";
import { MsorgClient } from "./msorg.js";
export declare function createSemzAdapter(config: ProviderConfigBase, fetchFn?: typeof fetch): MsorgClient;
//# sourceMappingURL=semz.d.ts.map