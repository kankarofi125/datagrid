"use client";

import { cn } from "@/lib/cn";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Sheet({ open, onClose, title, children, className }: Props) {
  useEffect(() => {
    if (!open) return;
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || "Dialog"}
        className={cn(
          "sheet-enter relative z-10 w-full max-w-lg rounded-t-2xl border border-line bg-paper p-5 shadow-2xl sm:rounded-xl",
          "max-h-[90vh] overflow-y-auto",
          className
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/15 sm:hidden" />
        {title && (
          <div className="mb-4 flex items-center justify-between gap-3">
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
  );
}
