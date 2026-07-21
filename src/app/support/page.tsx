import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { SupportClient } from "@/components/marketing/SupportClient";

export default function PublicSupportPage() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP || "2348000000000";
  return (
    <div className="min-h-screen bg-paper">
      <TopUtilityStrip />
      <SupportClient phone={phone} />
    </div>
  );
}
