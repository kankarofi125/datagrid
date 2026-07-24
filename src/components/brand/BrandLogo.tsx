import Image from "next/image";
import { cn } from "@/lib/cn";
import logoLockup from "@/img/logo-lockup.png";

export function BrandLogo({
  variant = "lockup",
  className,
  priority = false,
  alt = "AYK Data Grid",
}: {
  variant?: "lockup" | "mark";
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const markOnly = variant === "mark";

  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden",
        markOnly ? "aspect-[3.25/1]" : "aspect-[2.05/1]",
        className
      )}
    >
      <Image
        src={logoLockup}
        alt={alt}
        priority={priority}
        placeholder="blur"
        sizes="(max-width: 768px) 140px, 180px"
        className={cn(
          "absolute -left-[18%] h-auto w-[133%] max-w-none",
          markOnly ? "-top-[40%]" : "-top-[25%]"
        )}
      />
    </span>
  );
}
