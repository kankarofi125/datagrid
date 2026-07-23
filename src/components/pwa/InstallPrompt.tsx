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
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let frame = 0;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (visits >= 2) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS does not fire beforeinstallprompt, so show a soft install hint there only.
    if (
      isIos &&
      visits >= 2 &&
      !window.matchMedia("(display-mode: standalone)").matches
    ) {
      const dismissed = localStorage.getItem("dg_install_dismissed");
      if (!dismissed) frame = requestAnimationFrame(() => setShow(true));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      cancelAnimationFrame(frame);
    };
  }, []);

  if (!show) return null;
  if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-3 bottom-24 z-50 rounded-2xl border border-white/10 bg-green-deep p-3.5 text-paper shadow-2xl lg:bottom-6 lg:left-auto lg:right-8 lg:max-w-[340px] lg:p-4"
      role="dialog"
      aria-label="Install DataGrid"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber font-display text-xs text-[#2c1b02]">
          DG
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Install DataGrid</p>
          <p className="mt-0.5 text-xs leading-relaxed text-paper/65">
            Faster access and offline receipts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShow(false);
            localStorage.setItem("dg_install_dismissed", "1");
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-paper/45 hover:bg-white/5 hover:text-paper"
          aria-label="Dismiss install prompt"
        >
          ×
        </button>
      </div>
      <div className="mt-3 flex gap-2 pl-[52px]">
        {deferred && (
          <Button
            size="sm"
            variant="amber"
            className="flex-1"
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
          className="flex-1 border-white/20 text-paper"
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
