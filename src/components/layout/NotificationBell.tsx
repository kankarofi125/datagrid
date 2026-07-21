"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/Sheet";

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
          setOpen(true);
          load();
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

      <Sheet open={open} onClose={() => setOpen(false)} title="ALERTS.">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-mono-num text-[10px] tracking-wide text-ink/45">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="font-mono-num text-[10px] tracking-wide text-green"
            >
              MARK ALL READ
            </button>
          )}
        </div>

        <ul className="max-h-[min(52vh,380px)] space-y-0 overflow-y-auto overscroll-contain rounded-xl border border-line">
          {items.length === 0 ? (
            <li className="px-3 py-10 text-center text-sm text-ink/50">
              No notifications yet.
            </li>
          ) : (
            items.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "border-b border-line px-3 py-3 last:border-0",
                  n.status === "UNREAD" && "bg-green/[0.04]"
                )}
              >
                <div className="flex items-start gap-2">
                  {n.status === "UNREAD" && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-ink">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink/55">{n.body}</p>
                    <p className="font-mono-num mt-1.5 text-[9px] text-ink/35">
                      {new Date(n.createdAt).toLocaleString("en-NG", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>

        <Link
          href="/history"
          className="mt-4 flex h-11 items-center justify-center rounded-lg border border-green/30 text-sm font-semibold text-green"
          onClick={() => setOpen(false)}
        >
          View history
        </Link>
      </Sheet>
    </div>
  );
}
