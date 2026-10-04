import { createAlrahuzAdapter } from "./alrahuz.js";
import { createGladtidingsAdapter } from "./gladtidings.js";
import { createEasyAccessAdapter } from "./easyaccess.js";
import { createDataGiftingAdapter } from "./datagifting.js";
import { createGsubzAdapter } from "./gsubz.js";
import { createSemzAdapter } from "./semz.js";
import { createPeyflexAdapter } from "./peyflex.js";
/**
 * Tie-break when prices are equal (index 0 = most preferred).
 * DataGifting is intentionally absent: it stays in the registry but is
 * disabled by default and loses ties (rank 999) if someone turns it on.
 */
export const TIE_BREAK_ORDER = [
    "gsubz",
    "semz",
    "gladtidings",
    "easyaccess",
    "peyflex",
    "alrahuz",
];
export function tieBreakRank(id) {
    const i = TIE_BREAK_ORDER.indexOf(id);
    return i === -1 ? 999 : i;
}
export function buildProviderRegistry(config) {
    const map = new Map();
    const fetchFn = config.fetchFn;
    const maybeAdd = (id, cfg, factory) => {
        if (cfg?.enabled && cfg.baseUrl) {
            map.set(id, factory(cfg, fetchFn));
        }
    };
    maybeAdd("gsubz", config.providers.gsubz, createGsubzAdapter);
    maybeAdd("semz", config.providers.semz, createSemzAdapter);
    maybeAdd("gladtidings", config.providers.gladtidings, createGladtidingsAdapter);
    maybeAdd("easyaccess", config.providers.easyaccess, createEasyAccessAdapter);
    maybeAdd("peyflex", config.providers.peyflex, createPeyflexAdapter);
    maybeAdd("alrahuz", config.providers.alrahuz, createAlrahuzAdapter);
    // Registered only when explicitly enabled. Not part of TIE_BREAK_ORDER.
    maybeAdd("datagifting", config.providers.datagifting, createDataGiftingAdapter);
    return map;
}
export function configuredProviderIds(config) {
    const ids = [];
    for (const id of TIE_BREAK_ORDER) {
        const cfg = config.providers[id];
        if (cfg?.enabled)
            ids.push(id);
    }
    // Enabled providers outside the tie-break (DataGifting) still list, last.
    const extra = ["datagifting"];
    for (const id of extra) {
        if (config.providers[id]?.enabled)
            ids.push(id);
    }
    return ids;
}
//# sourceMappingURL=registry.js.map