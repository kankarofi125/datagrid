import { cn } from "@/lib/cn";

export type DashboardIconName =
  | "airtime"
  | "calendar"
  | "cable"
  | "data"
  | "exam"
  | "history"
  | "power"
  | "referrals"
  | "settings"
  | "wallet";

export function DashboardIcon({
  name,
  className,
}: {
  name: DashboardIconName;
  className?: string;
}) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", className)}
      aria-hidden
      {...shared}
    >
      {name === "data" && (
        <>
          <path d="M4 19V15" />
          <path d="M9.3 19V11" />
          <path d="M14.7 19V7" />
          <path d="M20 19V3" />
        </>
      )}
      {name === "airtime" && (
        <>
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
          <path d="M10 5.5h4M11 18.5h2" />
        </>
      )}
      {name === "power" && <path d="m13.5 2.5-9 11h6l-1 8 10-12h-6Z" />}
      {name === "history" && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </>
      )}
      {name === "wallet" && (
        <>
          <rect x="2.5" y="5.5" width="19" height="14" rx="2.5" />
          <path d="M2.5 9.5h19M16 14h2.5" />
        </>
      )}
      {name === "cable" && (
        <>
          <rect x="2.5" y="4.5" width="19" height="13" rx="2.5" />
          <path d="M8 21h8M12 17.5V21" />
        </>
      )}
      {name === "exam" && (
        <>
          <path d="m12 3 9 4-9 4-9-4 9-4Z" />
          <path d="M5 9v6c3.5 2.5 10.5 2.5 14 0V9" />
        </>
      )}
      {name === "calendar" && (
        <>
          <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
          <path d="M7.5 2.5v4M16.5 2.5v4M3 9.5h18" />
        </>
      )}
      {name === "referrals" && (
        <>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.6-4 3-6 6.5-6s5.9 2 6.5 6" />
          <path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 14c2.2.7 3.5 2.4 4 5" />
        </>
      )}
      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 13.5v-3l-2-.7-.7-1.6.9-1.9-2.1-2.1-1.9.9-1.6-.7L11 2H8l-.7 2.4-1.6.7-1.9-.9-2.1 2.1.9 1.9-.7 1.6-2 .7v3l2 .7.7 1.6-.9 1.9 2.1 2.1 1.9-.9 1.6.7L8 22h3l.7-2.4 1.6-.7 1.9.9 2.1-2.1-.9-1.9.7-1.6 1.9-.7Z" />
        </>
      )}
    </svg>
  );
}
