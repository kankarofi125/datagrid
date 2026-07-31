"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** Web OAuth client ID (public). */
  clientId: string;
  /**
   * GIS context: "signin" | "signup" | "use".
   * Marketing pages use "signin" (Google still offers continue).
   */
  context?: "signin" | "signup" | "use";
  /** Auto-prompt One Tap after load (default true). */
  autoPrompt?: boolean;
  /** Called when user dismisses or One Tap is skipped. */
  onSkipped?: () => void;
};

type GisCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleAccountsId = {
  initialize: (config: Record<string, unknown>) => void;
  prompt: (cb?: (notification: {
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
    isDismissedMoment: () => boolean;
    getNotDisplayedReason?: () => string;
    getSkippedReason?: () => string;
    getDismissedReason?: () => string;
  }) => void) => void;
  cancel: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";
const STORAGE_COOLDOWN = "dg_one_tap_skip_until";
const COOLDOWN_MS = 45 * 60 * 1000; // 45 min after dismiss (respect user)

function inCooldown(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_COOLDOWN);
    if (!raw) return false;
    return Date.now() < Number(raw);
  } catch {
    return false;
  }
}

function setCooldown() {
  try {
    sessionStorage.setItem(STORAGE_COOLDOWN, String(Date.now() + COOLDOWN_MS));
  } catch {
    /* private mode */
  }
}

function loadGsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${GSI_SRC}"]`
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("GSI script failed")),
        { once: true }
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("GSI script failed"));
    document.head.appendChild(script);
  });
}

/**
 * Google One Tap — soft top-right prompt (GIS).
 * Does not replace the full OAuth button; works alongside it.
 */
export function GoogleOneTap({
  clientId,
  context = "signin",
  autoPrompt = true,
  onSkipped,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const handleCredential = useCallback(
    async (response: GisCredentialResponse) => {
      const credential = response.credential;
      if (!credential || busy) return;

      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/google/one-tap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Google sign-in failed");
          return;
        }
        const dest =
          typeof data.redirectTo === "string" ? data.redirectTo : "/dashboard";
        router.replace(dest);
        router.refresh();
      } catch {
        setError("Network error. Try Continue with Google instead.");
      } finally {
        setBusy(false);
      }
    },
    [busy, router]
  );

  useEffect(() => {
    if (!clientId || !autoPrompt || started.current) return;
    if (typeof window === "undefined") return;
    if (inCooldown()) {
      onSkipped?.();
      return;
    }

    // Prefer reduced motion / low-data users: skip auto UI
    if (document.documentElement.classList.contains("low-data")) {
      onSkipped?.();
      return;
    }

    let cancelled = false;
    started.current = true;

    void (async () => {
      try {
        await loadGsiScript();
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          context,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
          use_fedcm_for_prompt: true,
        });

        window.google.accounts.id.prompt((notification) => {
          if (
            notification.isNotDisplayed() ||
            notification.isSkippedMoment() ||
            notification.isDismissedMoment()
          ) {
            const dismissed = notification.isDismissedMoment();
            if (dismissed) setCooldown();
            onSkipped?.();
          }
        });
      } catch {
        onSkipped?.();
      }
    })();

    return () => {
      cancelled = true;
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [autoPrompt, clientId, context, handleCredential, onSkipped]);

  if (!error && !busy) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed right-3 top-3 z-[90] max-w-[min(92vw,320px)] sm:right-5 sm:top-4"
    >
      {busy && (
        <div className="pointer-events-auto rounded-xl border border-line bg-paper/95 px-3 py-2 text-xs font-medium text-ink shadow-[0_12px_40px_-20px_rgba(14,33,26,.45)] backdrop-blur">
          Signing you in with Google…
        </div>
      )}
      {error && !busy && (
        <div className="pointer-events-auto rounded-xl border border-danger/20 bg-white px-3 py-2 text-xs text-danger shadow-[0_12px_40px_-20px_rgba(14,33,26,.45)]">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Server-friendly host: only renders when a client ID is available.
 * Pass clientId from a Server Component.
 */
export function GoogleOneTapHost({
  clientId,
  context = "signin",
}: {
  clientId?: string | null;
  context?: "signin" | "signup" | "use";
}) {
  if (!clientId) return null;
  return <GoogleOneTap clientId={clientId} context={context} autoPrompt />;
}
