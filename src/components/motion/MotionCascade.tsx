"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

const PREMIUM_EASE = [0.16, 1, 0.3, 1] as const;
const MAX_UNWRAP_DEPTH = 3;

function cascadeChildren(container: HTMLElement, depth = 0): HTMLElement[] {
  const children = Array.from(container.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  );

  if (children.length === 1 && depth < MAX_UNWRAP_DEPTH) {
    const child = children[0];
    if (!child.matches("[data-motion-owned], [data-motion-static]")) {
      return cascadeChildren(child, depth + 1);
    }
  }

  return children;
}

function collectCandidates(root: HTMLElement) {
  const candidates = new Set<HTMLElement>();
  const addChildren = (container: HTMLElement) => {
    for (const child of cascadeChildren(container)) {
      if (child.hasAttribute("data-motion-cascade")) {
        addChildren(child);
      } else {
        candidates.add(child);
      }
    }
  };

  addChildren(root);
  root
    .querySelectorAll<HTMLElement>("[data-motion-cascade]")
    .forEach((container) => addChildren(container));

  return [...candidates].filter(
    (element) =>
      !element.matches("[data-motion-owned], [data-motion-static]") &&
      !element.closest("[data-motion-owned]")
  );
}

/**
 * Adds an IntersectionObserver-driven Framer Motion cascade to arbitrary
 * server-rendered route content. Pages retain Server Component boundaries;
 * only this small orchestration island ships to the browser.
 */
export function MotionCascade({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = scope.current;
    if (!root) {
      return;
    }

    if (reduced || document.documentElement.classList.contains("low-data")) {
      return;
    }

    const managed = new Set<HTMLElement>();
    const animations = new Map<HTMLElement, { stop: () => void }>();
    const reveal = (element: HTMLElement, index: number) => {
      if (element.dataset.motionRevealed === "true") return;
      const controls = animate(
        element,
        {
          opacity: 1,
          transform: "translate3d(0, 0, 0) scale(1)",
          filter: "blur(0px)",
        },
        {
          duration: 0.72,
          delay: Math.min(index % 4, 3) * 0.055,
          ease: PREMIUM_EASE,
        }
      );
      element.dataset.motionRevealed = "true";
      animations.set(element, controls);
    };

    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const element = entry.target as HTMLElement;
                reveal(element, Number(element.dataset.motionIndex || 0));
                observer?.unobserve(element);
              }
            },
            {
              threshold: 0.14,
              rootMargin: "0px 0px -8% 0px",
            }
          )
        : null;

    const registerCandidates = () => {
      for (const element of managed) {
        if (root.contains(element)) continue;
        observer?.unobserve(element);
        animations.get(element)?.stop();
        animations.delete(element);
        managed.delete(element);
      }

      for (const element of collectCandidates(root)) {
        if (managed.has(element)) continue;
        const index = managed.size;
        managed.add(element);
        element.dataset.motionIndex = String(index);
        element.style.opacity = "0";
        element.style.transform = "translate3d(0, 24px, 0) scale(0.988)";
        element.style.filter = "blur(7px)";
        element.style.willChange = "transform, opacity, filter";

        if (observer) {
          observer.observe(element);
        } else {
          reveal(element, index);
        }
      }
    };

    registerCandidates();

    let frame = 0;
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(registerCandidates);
    });
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      cancelAnimationFrame(frame);
      observer?.disconnect();
      animations.forEach((controls) => controls.stop());
      for (const element of managed) {
        element.style.removeProperty("opacity");
        element.style.removeProperty("transform");
        element.style.removeProperty("filter");
        element.style.removeProperty("will-change");
        delete element.dataset.motionRevealed;
        delete element.dataset.motionIndex;
      }
    };
  }, [reduced]);

  return (
    <div ref={scope} className="contents" data-motion-scope>
      {children}
    </div>
  );
}
