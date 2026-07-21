"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Show install CTA after 2nd visit (spec §1.07).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const visits = Number(localStorage.getItem("dg_visits") || "0") + 1;
    localStorage.setItem("dg_visits", String(visits));

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (visits >= 2) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS / already installed: soft hint on 2nd visit
    if (visits >= 2 && !window.matchMedia("(display-mode: standalone)").matches) {
      const dismissed = localStorage.getItem("dg_install_dismissed");
      if (!dismissed) setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!show) return null;
  if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-3 bottom-20 z-50 rounded-xl border border-line bg-green-deep p-4 text-paper shadow-xl lg:bottom-6 lg:left-auto lg:right-8 lg:max-w-sm"
      role="dialog"
      aria-label="Install DataGrid"
    >
      <p className="font-mono-num text-[10px] tracking-widest text-amber">PWA · 2ND VISIT</p>
      <p className="mt-1 font-semibold">Install DataGrid</p>
      <p className="mt-1 text-sm text-paper/70">
        Home-screen app shell. Faster on 2G/3G. Works offline for cached pages.
      </p>
      <div className="mt-3 flex gap-2">
        {deferred && (
          <Button
            size="sm"
            variant="amber"
            onClick={async () => {
              await deferred.prompt();
              setShow(false);
              localStorage.setItem("dg_install_dismissed", "1");
            }}
          >
            Install
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="border-white/20 text-paper"
          onClick={() => {
            setShow(false);
            localStorage.setItem("dg_install_dismissed", "1");
          }}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
