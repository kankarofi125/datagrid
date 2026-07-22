import { cn } from "@/lib/cn";

export function AdminPageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-end justify-between gap-3 lg:mb-6",
        className
      )}
    >
      <div className="min-w-0">
        <p className="font-mono-num text-[9px] tracking-[0.16em] text-green lg:text-[10px]">
          {kicker}
        </p>
        <h1 className="font-display mt-1 text-2xl leading-none text-ink lg:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-xl text-xs text-ink/55 lg:text-sm">{description}</p>
        )}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
