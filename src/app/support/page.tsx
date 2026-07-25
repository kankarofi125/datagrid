import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { SupportClient } from "@/components/marketing/SupportClient";
import { createPublicMetadata } from "@/lib/site";

export const metadata = createPublicMetadata({
  title: "DataGrid Support",
  description:
    "Get help with a DataGrid order, wallet payment, receipt or account through our customer-support channel.",
  path: "/support",
  keywords: ["DataGrid support", "DataGrid customer service", "VTU support Nigeria"],
});

export default function PublicSupportPage() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP || "2348000000000";
  return (
    <div className="min-h-screen bg-paper">
      <TopUtilityStrip />
      <SupportClient phone={phone} />
    </div>
  );
}
