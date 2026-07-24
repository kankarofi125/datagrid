import { redirect } from "next/navigation";

export default function LegacyPinsPage() {
  redirect("/services?service=pins");
}
