"use client";

import { useMemo, useState } from "react";
import { formatNaira } from "@/lib/money";

export function MarginCalculator() {
  const [volume, setVolume] = useState(50000);
  const retail = 400;
  const reseller = 360;
  const units = Math.max(0, Math.floor(volume / retail));
  const margin = useMemo(() => units * (retail - reseller), [units]);

  return (
    <div className="surface h-full p-6">
      <p className="font-mono-num text-[11px] uppercase tracking-[0.16em] text-ink/50">
        Reseller margin desk
      </p>
      <h3 className="font-display mt-2 text-3xl text-ink">How agents earn</h3>
      <p className="mt-2 max-w-md text-sm text-ink/65">
        Wholesale rates unlock at agent tier. Drag monthly data GMV — see the spread.
      </p>

      <label className="mt-6 block">
        <span className="font-mono-num text-[11px] tracking-widest text-ink/50">
          MONTHLY DATA VOLUME
        </span>
        <input
          type="range"
          min={10000}
          max={500000}
          step={5000}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="mt-2 w-full accent-green"
        />
      </label>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div>
          <p className="font-mono-num text-[10px] text-ink/45">VOLUME</p>
          <p className="font-mono-num text-lg font-semibold">{formatNaira(volume, { compact: true })}</p>
        </div>
        <div>
          <p className="font-mono-num text-[10px] text-ink/45">UNITS @ 1GB</p>
          <p className="font-mono-num text-lg font-semibold">{units.toLocaleString("en-NG")}</p>
        </div>
        <div>
          <p className="font-mono-num text-[10px] text-amber">MARGIN</p>
          <p className="font-mono-num text-lg font-semibold text-green">
            {formatNaira(margin, { compact: true })}
          </p>
        </div>
      </div>
      <p className="font-mono-num mt-3 text-[11px] text-ink/45">
        ASSUMES ₦{retail} RETAIL / ₦{reseller} WHOLESALE ON MTN 1GB SME
      </p>
    </div>
  );
}
