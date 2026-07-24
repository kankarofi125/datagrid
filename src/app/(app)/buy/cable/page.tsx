import { redirect } from "next/navigation";

export default function LegacyCablePage() {
  redirect("/services?service=cable");
}
