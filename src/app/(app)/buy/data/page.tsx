"use client";

import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { BuyDataMobile, BuyDataConfirmSheet } from "@/components/buy/BuyDataMobile";
import { BuyDataDesktop } from "@/components/buy/BuyDataDesktop";
import { useBuyData } from "@/hooks/useBuyData";
import { SkeletonPage } from "@/components/ui/Skeleton";

export default function BuyDataPage() {
  const state = useBuyData();
  if (state.loading) {
    return <SkeletonPage variant="form" />;
  }
  return (
    <>
      <MobileOnly>
        <BuyDataMobile {...state} />
      </MobileOnly>
      <DesktopOnly>
        <BuyDataDesktop {...state} />
      </DesktopOnly>
      <BuyDataConfirmSheet s={state} />
    </>
  );
}
