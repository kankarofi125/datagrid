import Image from "next/image";
import { cn } from "@/lib/cn";
import brandMark from "@/img/image.png";

export function BrandLogo({
  variant = "lockup",
  tone = "default",
  className,
  priority = false,
  alt = "DataGrid",
}: {
  variant?: "lockup" | "mark";
  tone?: "default" | "inverse";
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const markOnly = variant === "mark";
  const inverse = tone === "inverse";
  const imageClass =
    "scale-[1.55] -translate-x-[7%] translate-y-[4%] object-contain";

  return (
    <span
      className={cn(
        "relative block aspect-square shrink-0 overflow-hidden",
        markOnly ? "rounded-[7px]" : "rounded-[9px]",
        className
      )}
    >
      <Image
        src={brandMark}
        alt={alt}
        priority={priority}
        fill
        sizes="(max-width: 768px) 64px, 72px"
        className={cn(imageClass, inverse && "brightness-0 invert")}
      />
      {inverse && (
        <Image
          src={brandMark}
          alt=""
          aria-hidden
          fill
          sizes="(max-width: 768px) 64px, 72px"
          className={imageClass}
          style={{ clipPath: "inset(50% 29% 31% 51%)" }}
        />
      )}
    </span>
  );
}
