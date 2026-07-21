"use client";

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "amber";

const variants: Record<Variant, string> = {
  primary:
    "bg-green text-white hover:bg-[#007a49] shadow-[0_1px_0_rgba(0,0,0,.12)] hover:shadow-[0_8px_20px_-8px_rgba(0,135,81,.55)]",
  secondary:
    "bg-green-deep text-paper hover:bg-[#063524] border border-white/10",
  ghost: "bg-transparent text-ink border border-line hover:bg-ink/5 hover:border-ink/25",
  danger: "bg-danger text-white hover:bg-[#d43d42]",
  amber: "bg-amber text-ink hover:bg-[#f0ab00] hover:shadow-[0_8px_20px_-8px_rgba(255,183,3,.5)]",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  type = "button",
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "pressable inline-flex items-center justify-center gap-2 font-semibold transition-[transform,box-shadow,background-color] duration-150 disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "h-9 px-3 text-sm rounded-md",
        size === "md" && "h-11 px-4 text-[15px] rounded-md",
        size === "lg" && "h-12 px-5 text-base rounded-lg",
        fullWidth && "w-full",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
