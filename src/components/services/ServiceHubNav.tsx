"use client";

import Link, { useLinkStatus } from "next/link";
import { DashboardIcon } from "@/components/dashboard/DashboardIcon";
import { cn } from "@/lib/cn";
import { SERVICE_OPTIONS, type ServiceKey } from "@/components/services/service-options";

export function ServiceHubNav({ active }: { active: ServiceKey }) {
  return (
    <section className="border-b border-line bg-white/75 px-3.5 py-3 backdrop-blur-sm lg:px-8 lg:py-5 xl:px-10">
      <div className="mb-2.5 flex items-end justify-between gap-4 lg:mb-4">
        <div>
          <p className="font-mono-num text-[9px] font-semibold uppercase tracking-[0.16em] text-green">
            One checkout desk
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-ink lg:text-2xl">
            Services
          </h1>
        </div>
        <p className="hidden max-w-sm text-right text-xs leading-relaxed text-ink/45 lg:block">
          Switch services without leaving your purchase workspace.
        </p>
      </div>

      <div className="-mx-3.5 flex snap-x gap-2 overflow-x-auto px-3.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {SERVICE_OPTIONS.map((service) => (
          <ServiceNavLink
            key={service.key}
            service={service}
            active={active === service.key}
          />
        ))}
      </div>
    </section>
  );
}

function ServiceNavLink({
  service,
  active,
}: {
  service: (typeof SERVICE_OPTIONS)[number];
  active: boolean;
}) {
  return (
    <Link
      href={`/services?service=${service.key}`}
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        "pressable relative flex min-w-[108px] snap-start items-center gap-2.5 rounded-xl border px-3 py-2.5 transition lg:min-w-0 lg:px-3.5 lg:py-3",
        active
          ? "border-green-deep bg-green-deep text-paper shadow-[0_12px_25px_-18px_rgba(10,46,34,.8)]"
          : "border-line bg-paper text-ink hover:border-green/25 hover:bg-white"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-white/10 text-amber" : "bg-green/8 text-green"
        )}
      >
        <DashboardIcon name={service.icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block whitespace-nowrap text-xs font-semibold">{service.label}</span>
        <span
          className={cn(
            "hidden truncate font-mono-num text-[8px] uppercase tracking-wide lg:block",
            active ? "text-paper/45" : "text-ink/35"
          )}
        >
          {service.detail}
        </span>
      </span>
      <PendingIndicator active={active} />
    </Link>
  );
}

function PendingIndicator({ active }: { active: boolean }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      className={cn(
        "absolute right-1.5 top-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2",
        active ? "border-paper/25 border-t-amber" : "border-green/20 border-t-green"
      )}
      aria-hidden
    />
  );
}
