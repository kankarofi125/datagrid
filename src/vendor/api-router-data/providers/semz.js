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
import { MsorgClient } from "./msorg.js";
export function createSemzAdapter(config, fetchFn) {
    return new MsorgClient({
        ...config,
        providerId: "semz",
        fetchFn,
    });
}
//# sourceMappingURL=semz.js.map