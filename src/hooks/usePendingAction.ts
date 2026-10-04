"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Pending flag that flips on the click frame, plus which action is running.
 *
 * `useTransition().pending` is a low-priority update, so a button can sit
 * unchanged until React gets around to rendering it. This sets an urgent
 * state inside the event handler, which React flushes before paint — the
 * spinner appears the moment the button is pressed.
 *
 *   const { pending, action, run } = usePendingAction<"save" | "verify">();
 *   <Button loading={pending && action === "save"} onClick={() => run("save", work)}>
 */
export function usePendingAction<A extends string = string>() {
  const [action, setAction] = useState<A | null>(null);
  const busyRef = useRef<A | null>(null);

  const run = useCallback(async <T,>(which: A, work: () => Promise<T>) => {
    if (busyRef.current !== null) return undefined;
    busyRef.current = which;
    setAction(which);
    try {
      return await work();
    } finally {
      busyRef.current = null;
      setAction(null);
    }
  }, []);

  return {
    pending: action !== null,
    action,
    run,
  } as const;
}
