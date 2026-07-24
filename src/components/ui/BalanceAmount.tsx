import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";

export function BalanceAmount({
  amount,
  hidden = false,
  compact = false,
  variant = "hero",
  className,
}: {
  amount: number | string;
  hidden?: boolean;
  compact?: boolean;
  variant?: "hero" | "card" | "compact";
  className?: string;
}) {
  const formatted = hidden ? "₦••••••" : formatNaira(amount, { compact });
  const length = formatted.length;
  const size =
    variant === "compact"
      ? length > 22
        ? "text-[8px] sm:text-[9px]"
        : length > 18
          ? "text-[10px]"
          : length > 14
            ? "text-[11px]"
            : "text-xs"
      : variant === "card"
        ? length > 23
          ? "text-[16px] sm:text-[18px]"
          : length > 18
            ? "text-[19px] sm:text-[22px]"
            : length > 15
              ? "text-[22px] sm:text-[26px]"
              : "text-[29px] sm:text-[34px]"
        : length > 23
          ? "text-[18px] sm:text-[20px]"
          : length > 18
            ? "text-[21px] sm:text-[24px]"
            : length > 15
              ? "text-[25px] sm:text-[30px]"
              : "text-[34px] sm:text-[40px]";

  return (
    <span
      className={cn(
        "block max-w-full whitespace-nowrap font-mono-num font-semibold leading-none tracking-[-0.045em] tabular-nums",
        size,
        className
      )}
      title={hidden ? "Balance hidden" : formatted}
    >
      {formatted}
    </span>
  );
}
