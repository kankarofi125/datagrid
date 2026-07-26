"use client";

import { useCallback, useEffect, useRef } from "react";

/** Must match server SESSION_IDLE_MS (10 minutes). */
const IDLE_MS = 10 * 60 * 1000;
const CHECK_EVERY_MS = 15_000;

/**
 * Client-side idle logout: if no pointer/keyboard/touch activity for 10 minutes,
 * destroy the session and send the user to login.
 * Complements server-side lastActivityAt checks on navigations/API calls.
 */
export function SessionIdleGuard({
  loginPath = "/login?session=expired",
}: {
  /** Where to send the user after idle logout */
  loginPath?: string;
}) {
  const lastActive = useRef(Date.now());
  const loggingOut = useRef(false);

  const markActive = useCallback(() => {
    lastActive.current = Date.now();
  }, []);

  const logoutIdle = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    // Route Handler may mutate cookies; then land on login.
    const next = encodeURIComponent(loginPath);
    window.location.assign(`/api/auth/session/expire?next=${next}`);
  }, [loginPath]);

  useEffect(() => {
    const windowEvents = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
    ] as const;

    const onEvent = () => {
      if (document.visibilityState === "hidden") return;
      markActive();
    };

    for (const ev of windowEvents) {
      window.addEventListener(ev, onEvent, { passive: true });
    }
    document.addEventListener("visibilitychange", onEvent);

    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastActive.current >= IDLE_MS) {
        void logoutIdle();
      }
    }, CHECK_EVERY_MS);

    return () => {
      for (const ev of windowEvents) {
        window.removeEventListener(ev, onEvent);
      }
      document.removeEventListener("visibilitychange", onEvent);
      window.clearInterval(id);
    };
  }, [logoutIdle, markActive]);

  return null;
}
