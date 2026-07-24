import Image from "next/image";
import { cn } from "@/lib/cn";

/** Single static phone hero image — no scroll scrub / frame sequence */
export function HeroPhoneImage({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-[radial-gradient(circle_at_70%_35%,rgba(242,166,61,.14),transparent_27%),linear-gradient(145deg,#0f3b2a,#071f17)] py-12 sm:py-16 lg:py-24",
        className
      )}
      aria-label="DataGrid on mobile"
      data-heavy-media
    >
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-3 sm:gap-10 sm:px-4 lg:grid-cols-2 lg:gap-12 lg:px-8">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <p className="font-mono-num mb-2 text-[10px] uppercase tracking-[0.2em] text-amber sm:mb-3 sm:text-[11px]">
            THE GRID IN YOUR HAND
          </p>
          <h2 className="font-display text-[clamp(2rem,7vw,4.5rem)] leading-tight text-paper">
            From tap to
            <br />
            <span className="text-amber">full bars.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-paper/70 sm:mt-6 sm:text-base lg:mx-0">
            Number detect, plan pick, PIN confirm, delivered. Airtime and data
            that feel like infrastructure — not a lottery.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
            {["Prefix detection", "PIN protected", "Live receipts"].map((item) => (
              <span
                key={item}
                className="rounded-full bg-white/[0.07] px-3 py-1.5 font-mono-num text-[9px] uppercase tracking-wide text-paper/60"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="order-1 flex justify-center lg:order-2">
          <div className="relative w-[min(58vw,260px)] sm:w-[300px] lg:w-[340px]">
            <div className="relative overflow-hidden rounded-[1.75rem] border-[3px] border-white/15 bg-black shadow-[0_40px_80px_rgba(0,0,0,.55)] ring-1 ring-white/10 sm:rounded-[2rem]">
              <div className="absolute left-1/2 top-2 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-black/80 sm:h-5 sm:w-24" />
              <div className="relative aspect-[9/19.5]">
                <Image
                  src="/media/scroll/poster.jpg"
                  alt="DataGrid app on a phone"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 58vw, 340px"
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
