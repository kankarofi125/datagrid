"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/Sheet";

export type PickerOption = {
  value: string;
  label: string;
  /** Secondary line, e.g. type · validity. Matched by search. */
  meta?: string;
  /** Right-aligned accent text, e.g. price. */
  price?: string;
};

type Props = {
  label?: string;
  hint?: string;
  error?: string;
  value: string;
  placeholder?: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Show search box. Defaults to true when options exceed 6. */
  searchable?: boolean;
};

/**
 * Branded dropdown — closed field looks like our Select, but the opened
 * menu is fully ours (bottom sheet on mobile, dialog on desktop) instead
 * of the browser's unstyleable native list.
 */
export function Picker({
  label,
  hint,
  error,
  value,
  placeholder = "Select…",
  options,
  onChange,
  disabled,
  searchable,
  className,
}: Props & { className?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const listId = useId().replace(/:/g, "");

  const showSearch = searchable ?? options.length > 6;
  const selected = options.find((o) => o.value === value) || null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.meta || "").toLowerCase().includes(q)
    );
  }, [options, query]);

  function openPicker() {
    if (disabled) return;
    setQuery("");
    setActive(() => {
      const i = options.findIndex((o) => o.value === value);
      return i >= 0 ? i : 0;
    });
    setOpen(true);
  }

  function closePicker(refocus = true) {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }

  function choose(v: string) {
    onChange(v);
    setOpen(false);
    buttonRef.current?.focus();
  }

  // Autofocus search on precise pointers only — popping the keyboard on
  // every open would be hostile on touch devices.
  useEffect(() => {
    if (!open || !showSearch) return;
    if (window.matchMedia("(pointer: fine)").matches) {
      document.getElementById(`${listId}-search`)?.focus();
    }
  }, [open, showSearch, listId]);

  // Keep the keyboard-active option in view.
  useEffect(() => {
    if (!open) return;
    const current = visible[active];
    if (current) optionRefs.current.get(current.value)?.scrollIntoView({ block: "nearest" });
  }, [open, active, visible]);

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      const current = visible[active];
      if (current) {
        e.preventDefault();
        choose(current.value);
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="font-mono-num flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-ink/70 sm:text-[11px]">
          <span className="inline-block h-3 w-0.5 rounded-full bg-green" aria-hidden />
          {label}
        </span>
      )}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-line bg-white py-3 pl-3.5 pr-2.5 text-left shadow-[0_1px_0_rgba(14,33,26,.02)] transition-[border-color,box-shadow]",
          "outline-none ring-0 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/12",
          !selected && "text-ink/40",
          selected && "font-semibold text-ink",
          error && "border-danger",
          "disabled:opacity-50"
        )}
      >
        <span className="font-mono-num min-w-0 flex-1 truncate text-[15px] tracking-wide sm:text-base">
          {selected ? selected.label : placeholder}
        </span>
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green/10"
        >
          <svg className="h-3.5 w-3.5 text-green" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {error ? (
        <p className="text-sm text-danger" role="alert">{error}</p>
      ) : hint ? (
        <p className="font-mono-num text-[11px] text-ink/50">{hint}</p>
      ) : null}

      <Sheet open={open} onClose={() => closePicker(false)} title={label || "Choose"}>
        {showSearch && (
          <div className="sticky top-0 z-10 bg-paper pb-2 pt-1">
            <input
              id={`${listId}-search`}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onListKeyDown}
              placeholder="Search…"
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink outline-none placeholder:text-ink/30 focus:border-green focus:ring-2 focus:ring-green/12"
            />
          </div>
        )}
        <div role="listbox" aria-label={label || "Options"} onKeyDown={onListKeyDown}>
          {visible.map((o, i) => {
            const isSelected = o.value === value;
            const isActive = i === active;
            return (
              <button
                key={o.value}
                ref={(el) => {
                  if (el) optionRefs.current.set(o.value, el);
                  else optionRefs.current.delete(o.value);
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(o.value)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "edge-card flex w-full items-center justify-between gap-3 rounded-xl border bg-paper px-3.5 py-3 text-left transition",
                  isActive ? "border-green/60" : "border-line",
                  isSelected && "ring-2 ring-green/20"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold">
                    {isSelected && (
                      <svg
                        className="h-4 w-4 shrink-0 text-green"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M3 8.5l3.5 3.5L13 4.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    <span className="truncate">{o.label}</span>
                  </span>
                  {o.meta && (
                    <span className="font-mono-num mt-0.5 block truncate text-[11px] text-ink/50">
                      {o.meta}
                    </span>
                  )}
                </span>
                {o.price && (
                  <span className="font-mono-num shrink-0 text-[15px] font-semibold text-green tabular-nums">
                    {o.price}
                  </span>
                )}
              </button>
            );
          })}
          {visible.length === 0 && (
            <p className="py-6 text-center text-sm text-ink/50">
              No matches. Try another search.
            </p>
          )}
        </div>
      </Sheet>
    </div>
  );
}
