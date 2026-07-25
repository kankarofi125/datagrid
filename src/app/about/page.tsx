import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { AboutClient } from "@/components/marketing/AboutClient";
import { createPublicMetadata } from "@/lib/site";

export const metadata = createPublicMetadata({
  title: "About DataGrid",
  description:
    "Learn how DataGrid provides reliable airtime, data and bill-payment services in Nigeria with provider failover, secure money paths and clear order trails.",
  path: "/about",
  keywords: ["about DataGrid", "reliable VTU Nigeria", "DataGrid Nigeria"],
});

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper">
      <TopUtilityStrip />
      <AboutClient />
    </div>
  );
}
