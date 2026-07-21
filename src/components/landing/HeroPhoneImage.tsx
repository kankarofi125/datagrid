import Image from "next/image";
import { cn } from "@/lib/cn";

/** Single static phone hero image — no scroll scrub / frame sequence */
export function HeroPhoneImage({ className }: { className?: string }) {
  return (
    <section
      className={cn("relative overflow-hidden bg-green-deep py-16 lg:py-24", className)}
      aria-label="DataGrid on mobile"
      data-heavy-media
    >
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-80" aria-hidden />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-2 lg:gap-12 lg:px-8">
        <div>
          <p className="font-mono-num mb-3 text-[11px] uppercase tracking-[0.2em] text-amber">
            THE GRID IN YOUR HAND
          </p>
          <h2 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] text-paper">
            From tap to
            <br />
            <span className="text-amber">full bars.</span>
          </h2>
          <p className="mt-6 max-w-md text-base text-paper/70">
            Number detect, plan pick, PIN confirm, delivered. Airtime and data
            that feel like infrastructure — not a lottery.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="relative w-[min(72vw,320px)] sm:w-[340px]">
            <div className="relative overflow-hidden rounded-[2rem] border-[3px] border-white/15 bg-black shadow-[0_40px_80px_rgba(0,0,0,.55)] ring-1 ring-white/10">
              <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-black/80" />
              <div className="relative aspect-[9/19.5]">
                <Image
                  src="/media/scroll/poster.jpg"
                  alt="DataGrid app on a phone"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 72vw, 340px"
                  priority={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
