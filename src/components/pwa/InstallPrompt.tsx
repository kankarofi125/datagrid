"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "dg_install_dismissed";
const INSTALLED_KEY = "dg_install_installed";
const VISITS_KEY = "dg_visits";
const VISIT_RECORDED_KEY = "dg_visit_recorded";
const SHOWN_THIS_SESSION_KEY = "dg_install_prompt_shown";

function readStorage(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function isInstalled() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true ||
    readStorage(localStorage, INSTALLED_KEY) === "1"
  );
}

/**
 * Offer installation after the second browsing session. A dismissal is durable
 * across routes and reloads, while the prompt can appear at most once per session.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let visits = Number(readStorage(localStorage, VISITS_KEY) || "0");
    if (readStorage(sessionStorage, VISIT_RECORDED_KEY) !== "1") {
      visits += 1;
      writeStorage(localStorage, VISITS_KEY, String(visits));
      writeStorage(sessionStorage, VISIT_RECORDED_KEY, "1");
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let frame = 0;

    const shouldOfferInstall = () =>
      visits >= 2 &&
      !isInstalled() &&
      readStorage(localStorage, DISMISSED_KEY) !== "1" &&
      readStorage(sessionStorage, SHOWN_THIS_SESSION_KEY) !== "1";

    const reveal = () => {
      if (!shouldOfferInstall()) return;
      writeStorage(sessionStorage, SHOWN_THIS_SESSION_KEY, "1");
      setShow(true);
    };

    const onBeforeInstallPrompt = (event: Event) => {
      // Keep control of the browser prompt even after the custom prompt has
      // been dismissed, so Chromium does not replace it with its own UI.
      event.preventDefault();
      if (!shouldOfferInstall()) return;
      setDeferred(event as BeforeInstallPromptEvent);
      reveal();
    };

    const onAppInstalled = () => {
      writeStorage(localStorage, INSTALLED_KEY, "1");
      setDeferred(null);
      setShow(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    // iOS does not fire beforeinstallprompt, so show a soft install hint there only.
    if (isIos && shouldOfferInstall()) {
      frame = requestAnimationFrame(reveal);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      cancelAnimationFrame(frame);
    };
  }, []);

  if (!show) return null;

  function dismiss() {
    writeStorage(localStorage, DISMISSED_KEY, "1");
    writeStorage(sessionStorage, SHOWN_THIS_SESSION_KEY, "1");
    setDeferred(null);
    setShow(false);
  }

  async function install() {
    if (!deferred) return;

    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      writeStorage(localStorage, INSTALLED_KEY, "1");
    } else {
      writeStorage(localStorage, DISMISSED_KEY, "1");
    }
    setDeferred(null);
    setShow(false);
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
          onClick={dismiss}
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
            onClick={install}
          >
            Install
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 border-white/20 text-paper"
          onClick={dismiss}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
