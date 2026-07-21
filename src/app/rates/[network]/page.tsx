import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { NetworkRateClient } from "@/components/marketing/NetworkRateClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string }>;
}) {
  const { network } = await params;
  const n = network.toUpperCase();
  return {
    title: `Buy ${n} Data Nigeria — Cheap Reseller Rates`,
    description: `Buy ${n} data Nigeria online. Instant delivery. SME, gifting, retail plans on DataGrid.`,
  };
}

export default async function NetworkRatePage({
  params,
}: {
  params: Promise<{ network: string }>;
}) {
  const { network } = await params;
  const n = network.toUpperCase();
  return (
    <div className="min-h-screen bg-paper">
      <TopUtilityStrip />
      <NetworkRateClient network={n} />
    </div>
  );
}
