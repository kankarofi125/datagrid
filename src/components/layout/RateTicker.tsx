"use client";

const DEFAULT_ITEMS = [
  "MTN 1GB SME ₦400",
  "GLO 2GB GIFTING ₦950",
  "AIRTEL 1.5GB ₦500",
  "DSTV PADI ₦2,950",
  "IKEDC TOKEN INSTANT",
  "9MOBILE 1GB ₦400",
  "GOTV JOLLI ₦3,300",
  "WAEC PIN ₦3,500",
  "MTN 5GB ₦1,800",
  "PHED PREPAID LIVE",
];

export function RateTicker({ items = DEFAULT_ITEMS }: { items?: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div
      className="overflow-hidden border-y border-line bg-paper"
      aria-label="Live rate ticker"
    >
      <div className="marquee-track flex w-max gap-8 py-2.5 whitespace-nowrap">
        {doubled.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="font-mono-num text-[12px] tracking-[0.08em] text-ink/80"
          >
            <span className="mr-2 text-green">●</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
