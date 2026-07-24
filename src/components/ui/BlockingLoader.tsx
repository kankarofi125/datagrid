"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

type BlockingOptions = {
  /** Prevent a quick response from flashing the overlay too briefly. */
  minimumMs?: number;
};

type BlockingLoaderContextValue = {
  active: boolean;
  runBlocking: <T>(
    operation: () => Promise<T>,
    options?: BlockingOptions
  ) => Promise<T>;
};

const BlockingLoaderContext = createContext<BlockingLoaderContextValue | null>(null);
const LOADER_MINIMUM_MS = 1400;
const INITIAL_READY_TIMEOUT_MS = 12000;

function TypewrittenBrand() {
  const reduced = useReducedMotion();
  const word = "DataGrid";
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (reduced) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setLength(index);
      if (index >= word.length) window.clearInterval(timer);
    }, 120);

    return () => window.clearInterval(timer);
  }, [reduced]);

  return (
    <p
      aria-hidden
      className="font-mono-num min-h-5 text-[12px] font-semibold tracking-[0.08em] text-ink/64 sm:text-[13px] lg:text-[14px]"
    >
      {reduced ? word : word.slice(0, length)}
      <span className="blocking-loader-caret" />
    </p>
  );
}

function BlockingOverlay({
  active,
  overlayRef,
}: {
  active: boolean;
  overlayRef: React.RefObject<HTMLDivElement | null>;
}) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          ref={overlayRef}
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          aria-label="DataGrid is processing your request"
          data-blocking-loader-overlay
          tabIndex={-1}
          className="fixed inset-0 z-[9999] flex cursor-wait items-center justify-center bg-paper/20 px-5"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="flex flex-col items-center gap-2.5 sm:gap-3"
            initial={reduced ? false : { opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: reduced ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="blocking-loader-mark" aria-hidden>
              <span className="blocking-loader-cell blocking-loader-tl" />
              <span className="blocking-loader-cell blocking-loader-tr" />
              <span className="blocking-loader-cell blocking-loader-br" />
              <span className="blocking-loader-cell blocking-loader-bl" />
            </div>
            <TypewrittenBrand />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function BlockingLoaderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Starting at one server-renders the loader on a full refresh instead of
  // waiting until hydration to reveal it.
  const [activeJobs, setActiveJobs] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const priorFocus = useRef<HTMLElement | null>(null);
  const active = activeJobs > 0;

  const runBlocking = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      { minimumMs = LOADER_MINIMUM_MS }: BlockingOptions = {}
    ) => {
      const startedAt = performance.now();
      setActiveJobs((count) => count + 1);

      try {
        return await operation();
      } finally {
        const remaining = minimumMs - (performance.now() - startedAt);
        if (remaining > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remaining));
        }
        setActiveJobs((count) => Math.max(0, count - 1));
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    let readinessFrame = 0;
    let onWindowLoad: (() => void) | null = null;

    const minimumAnimation = new Promise<void>((resolve) => {
      window.setTimeout(resolve, LOADER_MINIMUM_MS);
    });
    const windowLoaded = new Promise<void>((resolve) => {
      if (document.readyState === "complete") {
        resolve();
        return;
      }
      onWindowLoad = () => resolve();
      window.addEventListener("load", onWindowLoad, { once: true });
    });

    void Promise.all([minimumAnimation, windowLoaded]).then(() => {
      const readinessStartedAt = performance.now();
      let stableFrames = 0;

      const releaseWhenContentIsReady = () => {
        if (cancelled) return;

        const content = contentRef.current;
        const stillShowingSkeleton = Boolean(
          content?.querySelector('[aria-busy="true"], .skeleton-shimmer')
        );

        stableFrames = stillShowingSkeleton ? 0 : stableFrames + 1;
        const timedOut =
          performance.now() - readinessStartedAt >= INITIAL_READY_TIMEOUT_MS;

        if (stableFrames >= 2 || timedOut) {
          setActiveJobs((count) => Math.max(0, count - 1));
          return;
        }

        readinessFrame = requestAnimationFrame(releaseWhenContentIsReady);
      };

      readinessFrame = requestAnimationFrame(releaseWhenContentIsReady);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(readinessFrame);
      if (onWindowLoad) {
        window.removeEventListener("load", onWindowLoad);
      }
    };
  }, []);

  useEffect(() => {
    if (!active) return;

    priorFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const inertStates = new Map<HTMLElement, boolean>();

    const blockSibling = (node: Node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.hasAttribute("data-blocking-loader-overlay")) return;
      if (!inertStates.has(node)) inertStates.set(node, node.inert);
      node.inert = true;
    };

    Array.from(document.body.children).forEach(blockSibling);
    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach(blockSibling));
    });
    observer.observe(document.body, { childList: true });

    root.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => overlayRef.current?.focus());

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      inertStates.forEach((wasInert, element) => {
        if (element.isConnected) element.inert = wasInert;
      });
      root.style.overflow = previousOverflow;
      if (priorFocus.current?.isConnected) priorFocus.current.focus();
    };
  }, [active]);

  return (
    <BlockingLoaderContext.Provider value={{ active, runBlocking }}>
      <div
        ref={contentRef}
        aria-busy={active}
        className={cn(
          "flex min-h-full flex-1 flex-col transition-[filter,transform,opacity] duration-500 ease-[cubic-bezier(.16,1,.3,1)]",
          active &&
            "pointer-events-none select-none scale-[1.006] blur-[6px] saturate-[1.03] opacity-70"
        )}
      >
        {children}
      </div>
      <BlockingOverlay active={active} overlayRef={overlayRef} />
    </BlockingLoaderContext.Provider>
  );
}

export function useBlockingLoader() {
  const context = useContext(BlockingLoaderContext);
  if (!context) {
    throw new Error("useBlockingLoader must be used within BlockingLoaderProvider");
  }
  return context;
}
