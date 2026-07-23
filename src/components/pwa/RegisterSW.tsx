"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const enable =
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ENABLE_SW === "1";

    async function configureServiceWorker() {
      if (!enable) {
        // A production worker can otherwise keep controlling localhost and serve
        // stale Next.js HTML, causing Turbopack's client to reload forever.
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations
            .filter((registration) => registration.scope.startsWith(window.location.origin))
            .map((registration) => registration.unregister())
        );

        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames
              .filter((name) => name.startsWith("datagrid-"))
              .map((name) => caches.delete(name))
          );
        }
        return;
      }

      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }

    void configureServiceWorker().catch(() => {
      // PWA support must never prevent the application shell from rendering.
    });
  }, []);

  return null;
}
