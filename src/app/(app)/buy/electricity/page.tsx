import { redirect } from "next/navigation";

export default function LegacyElectricityPage() {
  redirect("/services?service=electricity");
}
