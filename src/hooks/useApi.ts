"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type State<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
};

/**
 * Fetch with skeleton-friendly loading states.
 * - loading: true only on first load (show skeleton)
 * - refreshing: true on subsequent reloads (keep UI, optional pulse)
 */
export function useApi<T>(
  url: string | null,
  opts?: { refreshMs?: number; enabled?: boolean }
) {
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: Boolean(url),
    refreshing: false,
  });
  const mounted = useRef(true);

  const load = useCallback(
    async (soft = false) => {
      if (!url) return;
      setState((s) => ({
        ...s,
        loading: soft ? s.loading : !s.data,
        refreshing: soft || Boolean(s.data),
        error: null,
      }));
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!mounted.current) return;
        if (!res.ok) {
          setState((s) => ({
            ...s,
            loading: false,
            refreshing: false,
            error: json.error || `Request failed (${res.status})`,
          }));
          return;
        }
        setState({
          data: json as T,
          error: null,
          loading: false,
          refreshing: false,
        });
      } catch (e) {
        if (!mounted.current) return;
        setState((s) => ({
          ...s,
          loading: false,
          refreshing: false,
          error: e instanceof Error ? e.message : "Network error",
        }));
      }
    },
    [url]
  );

  useEffect(() => {
    mounted.current = true;
    if (opts?.enabled === false || !url) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    load(false);
    let id: ReturnType<typeof setInterval> | undefined;
    if (opts?.refreshMs && opts.refreshMs > 0) {
      id = setInterval(() => load(true), opts.refreshMs);
    }
    return () => {
      mounted.current = false;
      if (id) clearInterval(id);
    };
  }, [url, opts?.enabled, opts?.refreshMs, load]);

  return {
    ...state,
    reload: () => load(true),
    reloadHard: () => load(false),
  };
}
