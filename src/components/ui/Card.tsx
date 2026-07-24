import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardTag = "div" | "section" | "article" | "aside" | "ul" | "li";

export function Card({
  as: Tag = "div",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: CardTag;
}) {
  return (
    <Tag className={cn("surface", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeading({
  kicker,
  title,
  description,
  action,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {kicker && (
          <p className="font-mono-num text-[9px] font-semibold uppercase tracking-[0.14em] text-green">
            {kicker}
          </p>
        )}
        <h2 className={cn("font-semibold text-ink", kicker ? "mt-1 text-base" : "text-base")}>
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-ink/50">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
