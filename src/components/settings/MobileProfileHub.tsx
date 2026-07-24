"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

type PanelKey = "personal" | "security" | "preferences" | "account";

type Panel = {
  key: PanelKey;
  eyebrow: string;
  title: string;
  summary: string;
  content: ReactNode;
};

export function MobileProfileHub({
  personal,
  security,
  preferences,
  account,
}: {
  personal: ReactNode;
  security: ReactNode;
  preferences: ReactNode;
  account: ReactNode;
}) {
  const reduced = useReducedMotion();
  const dragControls = useDragControls();
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);

  const panels: Panel[] = [
    {
      key: "personal",
      eyebrow: "Identity",
      title: "Personal details",
      summary: "Name, email and receipts",
      content: personal,
    },
    {
      key: "security",
      eyebrow: "Protection",
      title: "Security & verification",
      summary: "PIN, KYC and two-step security",
      content: security,
    },
    {
      key: "preferences",
      eyebrow: "Experience",
      title: "App preferences",
      summary: "Data usage and device controls",
      content: preferences,
    },
    {
      key: "account",
      eyebrow: "Account",
      title: "Account details",
      summary: "Referral, access and session",
      content: account,
    },
  ];

  const selected = panels.find((panel) => panel.key === activePanel);

  useEffect(() => {
    if (!activePanel) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [activePanel]);

  return (
    <>
      <motion.section
        initial={false}
        animate={
          reduced
            ? { opacity: 1, y: 0 }
            : { opacity: [0.88, 1], y: [14, 0] }
        }
        transition={{ duration: reduced ? 0 : 0.42, delay: reduced ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="surface overflow-hidden"
      >
        <div className="border-b border-line px-3.5 py-3">
          <p className="font-mono-num text-[8px] font-semibold uppercase tracking-[0.16em] text-green">
            Manage account
          </p>
          <h2 className="mt-0.5 text-sm font-semibold">Settings, without the clutter</h2>
        </div>

        <div className="divide-y divide-line">
          {panels.map((panel, index) => (
            <motion.button
              key={panel.key}
              type="button"
              onClick={() => setActivePanel(panel.key)}
              whileTap={reduced ? undefined : { scale: 0.985 }}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-green/8 font-mono-num text-[9px] font-semibold text-green">
                0{index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">{panel.title}</span>
                <span className="mt-0.5 block truncate text-[10px] text-ink/43">{panel.summary}</span>
              </span>
              <ChevronIcon />
            </motion.button>
          ))}
        </div>
      </motion.section>

      <section className="mt-3">
        <div className="mb-2 flex items-center justify-between px-0.5">
          <p className="font-mono-num text-[9px] font-semibold uppercase tracking-[0.14em] text-ink/42">
            Quick access
          </p>
          <Link href="/support" className="text-[10px] font-semibold text-green">
            Get help
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <CompactLink href="/analytics" label="Analytics" detail="Insights" />
          <CompactLink href="/history" label="Receipts" detail="Orders" />
          <CompactLink href="/referrals" label="Referrals" detail="Rewards" />
        </div>
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            onClick={() => setActivePanel(null)}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-panel-title"
              initial={reduced ? false : { y: "100%" }}
              animate={{ y: 0 }}
              exit={reduced ? { opacity: 0 } : { y: "100%" }}
              transition={{ type: "spring", stiffness: 390, damping: 36, mass: 0.92 }}
              drag={reduced ? false : "y"}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.22 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 700) setActivePanel(null);
              }}
              onClick={(event) => event.stopPropagation()}
              className="relative flex max-h-[min(88dvh,760px)] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-line bg-paper shadow-[0_-24px_70px_rgba(14,33,26,0.2)]"
            >
              <header className="shrink-0 border-b border-line bg-paper/94 px-3.5 pb-3 pt-2 backdrop-blur-xl">
                <button
                  type="button"
                  aria-label="Drag down to close"
                  onPointerDown={(event) => dragControls.start(event)}
                  className="mx-auto block w-full cursor-grab touch-none pb-2 pt-1 active:cursor-grabbing"
                >
                  <span className="mx-auto block h-1.5 w-11 rounded-full bg-ink/18" />
                </button>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono-num text-[8px] font-semibold uppercase tracking-[0.15em] text-green">
                      {selected.eyebrow}
                    </p>
                    <h2 id="profile-panel-title" className="truncate text-base font-semibold">
                      {selected.title}
                    </h2>
                  </div>
                  <motion.button
                    autoFocus
                    type="button"
                    onClick={() => setActivePanel(null)}
                    whileTap={reduced ? undefined : { scale: 0.9 }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ink/[0.05] text-ink/55"
                    aria-label="Close profile settings"
                  >
                    <CloseIcon />
                  </motion.button>
                </div>
              </header>

              <motion.div
                key={selected.key}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4"
              >
                {selected.content}
              </motion.div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CompactLink({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link
      href={href}
      className="surface flex min-w-0 flex-col px-3 py-2.5 transition-colors active:bg-green/5"
    >
      <span className="truncate text-[11px] font-semibold">{label}</span>
      <span className="mt-0.5 font-mono-num text-[7px] uppercase tracking-wide text-ink/35">{detail}</span>
    </Link>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-ink/28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  );
}
