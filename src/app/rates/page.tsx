import { RateBoard } from "@/components/landing/RateBoard";
import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { RatesClient } from "@/components/marketing/RatesClient";
import { createPublicMetadata } from "@/lib/site";

export const metadata = createPublicMetadata({
  title: "Data Prices in Nigeria — MTN, Airtel, Glo & 9mobile",
  description:
    "Compare current MTN, Airtel, Glo and 9mobile data plans on DataGrid, including SME, gifting and retail options with instant delivery.",
  path: "/rates",
  keywords: [
    "data prices Nigeria",
    "cheap data Nigeria",
    "MTN data plans",
    "Airtel data plans",
    "Glo data plans",
    "9mobile data plans",
  ],
});

export default function RatesPage() {
  return (
    <div className="min-h-screen bg-paper">
      <TopUtilityStrip />
      <RatesClient>
        <RateBoard />
      </RatesClient>
    </div>
  );
}
