import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { AboutClient } from "@/components/marketing/AboutClient";

export const metadata = { title: "Trust & About" };

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper">
      <TopUtilityStrip />
      <AboutClient />
    </div>
  );
}
