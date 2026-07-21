"use client";

import { cn } from "@/lib/cn";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

const DISMISS_PX = 96;
const DISMISS_VELOCITY = 0.45; // px/ms

/**
 * Bottom sheet (mobile) / centered dialog (sm+).
 * Drag the handle or top of the panel down to dismiss.
 */
export function Sheet({ open, onClose, title, children, className }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startT = useRef(0);
  const dragging = useRef(false);
  const [offset, setOffset] = useState(0);
  const [draggingUi, setDraggingUi] = useState(false);

  useEffect(() => {
    if (!open) {
      setOffset(0);
      setDraggingUi(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const endDrag = useCallback(
    (clientY: number) => {
      if (!dragging.current) return;
      dragging.current = false;
      setDraggingUi(false);
      const dy = Math.max(0, clientY - startY.current);
      const dt = Math.max(1, Date.now() - startT.current);
      const velocity = dy / dt;
      if (dy > DISMISS_PX || velocity > DISMISS_VELOCITY) {
        setOffset(0);
        onClose();
      } else {
        setOffset(0);
      }
    },
    [onClose]
  );

  function onTouchStart(e: TouchEvent) {
    // Only start drag from handle / header zone (data-drag-handle)
    const target = e.target as HTMLElement;
    if (!target.closest("[data-drag-handle]")) return;
    const t = e.touches[0];
    if (!t) return;
    dragging.current = true;
    setDraggingUi(true);
    startY.current = t.clientY;
    startT.current = Date.now();
  }

  function onTouchMove(e: TouchEvent) {
    if (!dragging.current) return;
    const t = e.touches[0];
    if (!t) return;
    const dy = Math.max(0, t.clientY - startY.current);
    setOffset(dy);
    // Prevent page scroll while dragging sheet closed
    if (dy > 4) e.preventDefault();
  }

  function onTouchEnd(e: TouchEvent) {
    const t = e.changedTouches[0];
    endDrag(t?.clientY ?? startY.current);
  }

  if (!open) return null;

  const backdropOpacity = Math.max(0.15, 0.5 * (1 - offset / 320));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 backdrop-blur-[2px] transition-opacity"
        style={{ backgroundColor: `rgba(11, 35, 26, ${backdropOpacity})` }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Dialog"}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className={cn(
          "relative z-10 w-full max-w-lg border border-line bg-paper shadow-2xl",
          "rounded-t-2xl sm:rounded-xl",
          "max-h-[90vh] overflow-y-auto overscroll-contain",
          !draggingUi && "sheet-enter",
          className
        )}
        style={{
          transform: offset ? `translate3d(0, ${offset}px, 0)` : undefined,
          transition: draggingUi ? "none" : "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          touchAction: "pan-y",
        }}
      >
        {/* Drag handle — mobile */}
        <div
          data-drag-handle
          className="sticky top-0 z-10 cursor-grab bg-paper pt-3 pb-1 sm:hidden active:cursor-grabbing"
          aria-hidden
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-ink/20" />
          <p className="mt-1.5 text-center font-mono-num text-[9px] tracking-wide text-ink/30">
            SWIPE DOWN TO CLOSE
          </p>
        </div>

        <div className="px-5 pb-5 pt-2 sm:p-5">
          {title && (
            <div
              data-drag-handle
              className="mb-4 flex items-center justify-between gap-3"
            >
              <h2 className="font-display text-2xl text-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="font-mono-num text-xs uppercase tracking-widest text-ink/50 hover:text-ink"
              >
                Close
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
