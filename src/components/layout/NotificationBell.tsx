"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

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

  const load = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setUnread(d.unread || 0);
        setItems(d.notifications || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative rounded-md border border-line bg-paper p-2 text-ink hover:border-green"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
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

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-paper shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <p className="font-mono-num text-[10px] tracking-widest text-ink/50">
                NOTIFICATIONS
              </p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="font-mono-num text-[10px] text-green"
                >
                  MARK ALL READ
                </button>
              )}
            </div>
            <ul className="max-h-72 overflow-y-auto" aria-live="polite">
              {items.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-ink/50">No notifications</li>
              ) : (
                items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "border-b border-line px-3 py-3 last:border-0",
                      n.status === "UNREAD" && "bg-green/5"
                    )}
                  >
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="mt-0.5 text-xs text-ink/60">{n.body}</p>
                    <p className="font-mono-num mt-1 text-[10px] text-ink/40">
                      {new Date(n.createdAt).toLocaleString("en-NG")}
                    </p>
                  </li>
                ))
              )}
            </ul>
            <Link
              href="/history"
              className="block border-t border-line px-3 py-2 text-center text-xs text-green"
              onClick={() => setOpen(false)}
            >
              View history
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
