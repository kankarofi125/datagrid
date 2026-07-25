import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { NetworkRateClient } from "@/components/marketing/NetworkRateClient";
import { createPublicMetadata } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string }>;
}) {
  const { network } = await params;
  const n = network.toUpperCase();
  return createPublicMetadata({
    title: `${n} Data Plans & Prices in Nigeria`,
    description: `Compare and buy ${n} data plans online in Nigeria with secure checkout, clear pricing and fast delivery on DataGrid.`,
    path: `/rates/${network.toLowerCase()}`,
    keywords: [
      `${n} data plans`,
      `${n} data prices Nigeria`,
      `buy ${n} data online`,
      `cheap ${n} data`,
    ],
  });
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
