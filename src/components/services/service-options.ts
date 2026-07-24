import type { DashboardIconName } from "@/components/dashboard/DashboardIcon";

export const SERVICE_OPTIONS = [
  { key: "data", label: "Data", detail: "SME & gifting", icon: "data" },
  { key: "airtime", label: "Airtime", detail: "All networks", icon: "airtime" },
  { key: "electricity", label: "Power", detail: "Meter tokens", icon: "power" },
  { key: "cable", label: "Cable TV", detail: "DStv & GOtv", icon: "cable" },
  { key: "pins", label: "Exam pins", detail: "WAEC & more", icon: "exam" },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  detail: string;
  icon: DashboardIconName;
}>;

export type ServiceKey = (typeof SERVICE_OPTIONS)[number]["key"];
