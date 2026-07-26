/** Fixed Nigeria timezone for all app clocks and timestamps. */
export const NIGERIA_TIME_ZONE = "Africa/Lagos";

/** HH:MM:SS in Africa/Lagos */
export function formatNigeriaClock(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: NIGERIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/** Date + time in Nigeria (no city/state label). */
export function formatNigeriaDateTime(
  value: string | Date | number | null | undefined,
  opts?: { withSeconds?: boolean; dateOnly?: boolean }
): string {
  if (value == null) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  if (opts?.dateOnly) {
    return new Intl.DateTimeFormat("en-NG", {
      timeZone: NIGERIA_TIME_ZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-NG", {
    timeZone: NIGERIA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(opts?.withSeconds ? { second: "2-digit" as const } : {}),
    hour12: false,
  }).format(date);
}

/** Short relative-style stamp: 25 Jul, 14:30 (Lagos). */
export function formatNigeriaShort(value: string | Date | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: NIGERIA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
