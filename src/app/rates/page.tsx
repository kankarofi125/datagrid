import { RateBoard } from "@/components/landing/RateBoard";
import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { RatesClient } from "@/components/marketing/RatesClient";

export const metadata = {
  title: "Data Rates Nigeria",
  description: "Buy MTN, Glo, Airtel, 9mobile data Nigeria — live retail and reseller rates.",
};

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
