"use client";

import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { BuyDataMobile, BuyDataConfirmSheet } from "@/components/buy/BuyDataMobile";
import { BuyDataDesktop } from "@/components/buy/BuyDataDesktop";
import { useBuyData } from "@/hooks/useBuyData";

export default function BuyDataPage() {
  const state = useBuyData();
  return (
    <>
      <MobileOnly>
        <BuyDataMobile {...state} />
      </MobileOnly>
      <DesktopOnly>
        <BuyDataDesktop {...state} />
      </DesktopOnly>
      {/* Single confirm sheet shared across breakpoints */}
      <BuyDataConfirmSheet s={state} />
    </>
  );
}
