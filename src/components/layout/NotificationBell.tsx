"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { cn } from "@/lib/cn";
import { useRealtimeRefresh } from "@/hooks/useRealtime";
import { Skeleton } from "@/components/ui/Skeleton";

type Note = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
};

export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load notifications");
      const data = await response.json();
      setUnread(data.unread || 0);
      setItems(data.notifications || []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void load());
    const id = window.setInterval(load, 45000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useRealtimeRefresh("me", load, [
    "tx:delivered",
    "notifications:read",
    "invalidate",
  ]);

  async function markAll() {
    const previousItems = items;
    const previousUnread = unread;
    setItems((current) => current.map((note) => ({ ...note, status: "READ" })));
    setUnread(0);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error("Unable to mark notifications as read");
    } catch {
      setItems(previousItems);
      setUnread(previousUnread);
      setError(true);
    }
  }

  async function dismissNote(note: Note) {
    setItems((current) => current.filter((item) => item.id !== note.id));
    if (note.status === "UNREAD") setUnread((count) => Math.max(0, count - 1));

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id }),
      });
      if (!response.ok) throw new Error("Unable to dismiss notification");
    } catch {
      setItems((current) =>
        [...current, note].sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
        )
      );
      if (note.status === "UNREAD") setUnread((count) => count + 1);
      setError(true);
    }
  }

  function handleSwipe(note: Note, info: PanInfo) {
    if (Math.abs(info.offset.x) > 72 || Math.abs(info.velocity.x) > 650) {
      void dismissNote(note);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) void load();
        }}
        className="relative rounded-md border border-line bg-paper p-2 text-ink transition hover:border-green"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 9a6 6 0 1 1 12 0c0 3.5 1.5 5 2 6H4c.5-1 2-2.5 2-6Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 font-mono-num text-[9px] font-bold text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-2 top-[54px] z-[80] w-[min(86vw,310px)] overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_22px_58px_rgba(7,31,23,.2)] sm:absolute sm:right-0 sm:top-[calc(100%+10px)] sm:w-[370px] sm:rounded-[18px]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line bg-white px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
              <div>
                <p className="text-[13px] font-semibold text-ink sm:text-sm">Notifications</p>
                <p className="mt-0.5 font-mono-num text-[9px] uppercase tracking-wider text-ink/42">
                  {unread > 0 ? `${unread} unread` : "All caught up"}
                </p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAll()}
                    className="min-h-8 rounded-lg px-1.5 text-[9px] font-semibold text-green hover:bg-green/[0.06] sm:min-h-9 sm:px-2 sm:text-[10px]"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.045] text-base text-ink/55 sm:h-9 sm:w-9 sm:text-lg"
                  aria-label="Close notifications"
                >
                  ×
                </button>
              </div>
            </div>

            <ul className="max-h-[min(46vh,320px)] overflow-x-hidden overflow-y-auto overscroll-contain sm:max-h-[min(60vh,440px)]">
              {loading ? (
                <li className="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2 border-b border-line pb-2.5 last:border-0 sm:pb-3">
                      <Skeleton className="h-3 w-2/5" />
                      <Skeleton className="h-2.5 w-full" />
                    </div>
                  ))}
                </li>
              ) : error && items.length === 0 ? (
                <li className="px-3 py-7 text-center sm:px-4 sm:py-10">
                  <p className="text-sm font-medium text-ink/65">Alerts could not be loaded.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      void load();
                    }}
                    className="mt-3 text-xs font-semibold text-green"
                  >
                    Try again
                  </button>
                </li>
              ) : items.length === 0 ? (
                <li className="px-3 py-7 text-center text-[13px] text-ink/50 sm:px-4 sm:py-10 sm:text-sm">
                  You&apos;re all caught up.
                </li>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((note) => (
                    <motion.li
                      layout
                      key={note.id}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.72}
                      onDragEnd={(_, info) => handleSwipe(note, info)}
                      exit={{ opacity: 0, x: 120, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "touch-pan-y cursor-grab border-b border-line bg-paper px-3 py-2.5 active:cursor-grabbing sm:px-4 sm:py-3",
                        note.status === "UNREAD" && "bg-green/[0.045]"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            note.status === "UNREAD" ? "bg-green" : "bg-ink/15"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold leading-snug text-ink sm:text-[13px]">
                            {note.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink/55 sm:mt-1 sm:text-xs">{note.body}</p>
                          <p className="mt-1.5 font-mono-num text-[9px] text-ink/35">
                            {new Date(note.createdAt).toLocaleString("en-NG", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              )}
            </ul>

            <div className="flex items-center justify-between border-t border-line bg-white px-3 py-2 sm:px-4 sm:py-2.5">
              <span className="hidden text-[9px] text-ink/35 sm:inline">Swipe an alert to dismiss</span>
              <Link
                href="/history"
                className="ml-auto text-[11px] font-semibold text-green sm:text-xs"
                onClick={() => setOpen(false)}
              >
                View history →
              </Link>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
