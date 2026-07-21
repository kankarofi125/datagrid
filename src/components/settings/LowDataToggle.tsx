"use client";

import { useLowData } from "@/hooks/useLowData";

export function LowDataToggle() {
  const { lowData, toggle } = useLowData();

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono-num text-[10px] tracking-widest text-ink/45">
            DATA SAVER
          </p>
          <p className="mt-1 text-sm text-ink/70">
            Hide heavy media, stop marquees &amp; video on the marketing site. Better on 2G/3G.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={lowData}
          onClick={() => toggle()}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${
            lowData ? "bg-green" : "bg-ink/20"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-paper transition ${
              lowData ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
