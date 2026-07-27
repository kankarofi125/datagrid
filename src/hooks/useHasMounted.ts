"use client";

import { useSyncExternalStore } from "react";

/**
 * false on the server and during hydration; true after the client has mounted.
 * Prefer this over useEffect(() => setMounted(true)) to avoid hydration
 * mismatches and React setState-in-effect lint noise.
 */
export function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
