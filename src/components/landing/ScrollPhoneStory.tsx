"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Scroll-scrubbed phone story:
 * - Prefers MP4/WebM currentTime scrub when available
 * - Falls back to frame-sequence crossfade (keyframes)
 * Frames map the purchase journey: detect → plan → pin → processing → delivered → speed
 */

const KEYFRAMES = [
  {
    src: "/media/scroll/frame_00.jpg",
    caption: "01 · NUMBER DETECTED",
    sub: "0803 snaps to MTN. Prefix map is live.",
  },
  {
    src: "/media/scroll/frame_01.jpg",
    caption: "02 · PICK A PLAN",
    sub: "SME · Gifting · Retail. Prices from the grid.",
  },
  {
    src: "/media/scroll/frame_02.jpg",
    caption: "03 · CONFIRM WITH PIN",
    sub: "Four digits. Balance after shown before you pay.",
  },
  {
    src: "/media/scroll/frame_03.jpg",
    caption: "04 · PROCESSING",
    sub: "Provider trail. Failover is invisible.",
  },
  {
    src: "/media/scroll/frame_04.jpg",
    caption: "05 · DELIVERED",
    sub: "Receipt. Stamp. Share on WhatsApp.",
  },
  {
    src: "/media/scroll/frame_05.jpg",
    caption: "06 · CONNECTION UP",
    sub: "Data lands. The grid holds.",
  },
  {
    src: "/media/scroll/frame_06.jpg",
    caption: "07 · FULL SPEED",
    sub: "From wallet debit to bars up — seconds.",
  },
];

export function ScrollPhoneStory({ className }: { className?: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  const frameIndex = useMemo(() => {
    const max = KEYFRAMES.length - 1;
    return Math.min(max, Math.max(0, Math.round(progress * max)));
  }, [progress]);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const viewH = window.innerHeight;
        // progress 0 when section top hits viewport bottom, 1 when section bottom leaves top
        const total = rect.height + viewH;
        const scrolled = viewH - rect.top;
        const p = Math.min(1, Math.max(0, scrolled / total));
        // tighter scrub while section is sticky zone
        const stickyStart = rect.top <= 0;
        const stickyEnd = rect.bottom <= viewH;
        let scrub = p;
        if (stickyStart && !stickyEnd) {
          const travel = rect.height - viewH;
          scrub = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : p;
        }
        setProgress(scrub);

        const video = videoRef.current;
        if (video && videoReady && video.duration && !reduced) {
          const t = scrub * (video.duration - 0.05);
          if (Math.abs(video.currentTime - t) > 0.04) {
            try {
              video.currentTime = t;
            } catch {
              /* seek not ready */
            }
          }
        }
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [videoReady, reduced]);

  const active = KEYFRAMES[frameIndex];

  return (
    <section
      ref={sectionRef}
      className={cn("relative", className)}
      style={{ height: "280vh" }}
      aria-label="Phone purchase story — scroll to advance"
      data-heavy-media
    >
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden bg-green-deep">
        {/* Ambient grid + parallax offset */}
        <div
          className="bg-grid pointer-events-none absolute inset-0 opacity-80"
          style={{
            transform: reduced ? undefined : `translateY(${progress * -40}px)`,
          }}
          aria-hidden
        />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 lg:grid-cols-2 lg:gap-12">
          {/* Copy rail */}
          <div className="order-2 lg:order-1">
            <p className="font-mono-num mb-3 text-[11px] uppercase tracking-[0.2em] text-amber">
              Scroll the grid · frame {String(frameIndex + 1).padStart(2, "0")} /{" "}
              {String(KEYFRAMES.length).padStart(2, "0")}
            </p>
            <h2 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] text-paper">
              From tap to
              <br />
              <span className="text-amber">full bars.</span>
            </h2>
            <div className="mt-6 max-w-md border-l-2 border-amber pl-4">
              <p className="font-mono-num text-sm tracking-wide text-paper">
                {active.caption}
              </p>
              <p className="mt-2 text-base text-paper/70">{active.sub}</p>
            </div>

            {/* Step rail */}
            <ol className="mt-8 flex flex-wrap gap-2">
              {KEYFRAMES.map((f, i) => (
                <li
                  key={f.caption}
                  className={cn(
                    "font-mono-num rounded-sm border px-2 py-1 text-[10px] tracking-wider",
                    i === frameIndex
                      ? "border-amber bg-amber/15 text-amber"
                      : i < frameIndex
                        ? "border-green/40 text-green"
                        : "border-white/10 text-paper/40"
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </li>
              ))}
            </ol>

            {/* Progress bar */}
            <div
              className="mt-6 h-1 w-full max-w-md overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Story progress"
            >
              <div
                className="h-full bg-amber transition-[width] duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          {/* Phone stage */}
          <div className="order-1 flex justify-center lg:order-2">
            <div className="relative w-[min(72vw,320px)] sm:w-[340px]">
              {/* Device chrome */}
              <div className="relative overflow-hidden rounded-[2rem] border-[3px] border-white/15 bg-black shadow-[0_40px_80px_rgba(0,0,0,.55)] ring-1 ring-white/10">
                <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-black/80" />
                <div className="relative aspect-[9/19.5] bg-green-deep">
                  {/* Video scrub layer */}
                  <video
                    ref={videoRef}
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
                      videoReady ? "opacity-100" : "opacity-0"
                    )}
                    muted
                    playsInline
                    preload="auto"
                    poster={KEYFRAMES[0].src}
                    onLoadedMetadata={() => setVideoReady(true)}
                    onError={() => setVideoReady(false)}
                  >
                    <source src="/media/scroll/hero-phone.webm" type="video/webm" />
                    <source src="/media/scroll/hero-phone.mp4" type="video/mp4" />
                  </video>

                  {/* Frame fallback / reduced motion stills */}
                  {!videoReady || reduced
                    ? KEYFRAMES.map((f, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={f.src}
                          src={f.src}
                          alt=""
                          className={cn(
                            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
                            i === frameIndex ? "opacity-100" : "opacity-0"
                          )}
                          draggable={false}
                        />
                      ))
                    : null}

                  {/* Soft vignette */}
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-green-deep/40 via-transparent to-black/20"
                    aria-hidden
                  />
                </div>
              </div>

              {/* Annotation */}
              <p className="font-mono-num mt-4 text-center text-[10px] tracking-[0.18em] text-paper/45">
                SIMULATED DEVICE · DATAGRID CONTROL FEED
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
