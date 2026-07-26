"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "datagrid_balance_hidden";
const EVENT = "datagrid-balance-hidden";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStored(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
  // Same-tab listeners (storage event only fires cross-tab).
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onStoreChange);
  };
}

/**
 * Shared hide/show preference for wallet balances.
 * Uses useSyncExternalStore so toggles apply instantly across all mounts.
 */
export function useBalanceHidden() {
  const hidden = useSyncExternalStore(subscribe, readStored, () => false);

  const toggle = useCallback(() => {
    writeStored(!readStored());
  }, []);

  const setHidden = useCallback((value: boolean) => {
    writeStored(value);
  }, []);

  return { hidden, toggle, setHidden };
}
