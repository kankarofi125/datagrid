"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "datagrid_balance_hidden";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Shared hide/show preference for wallet balances across the app shell. */
export function useBalanceHidden() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(readStored());
  }, []);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }, []);

  const set = useCallback((value: boolean) => {
    setHidden(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  return { hidden, toggle, setHidden: set };
}
