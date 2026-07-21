import { LegalClient } from "@/components/marketing/LegalClient";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalClient
      title="TERMS."
      body="Transactions are final after delivery. Failed orders are refunded to wallet. Betting products are 18+. NIN-SIM regulations apply to telecom services."
    />
  );
}
