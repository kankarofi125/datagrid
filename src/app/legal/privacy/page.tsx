import { LegalClient } from "@/components/marketing/LegalClient";

export const metadata = { title: "Privacy (NDPR)" };

export default function PrivacyPage() {
  return (
    <LegalClient
      title="PRIVACY · NDPR"
      body="DataGrid processes phone numbers, transaction metadata, and optional KYC documents to deliver VTU services. Data is not sold. Retention follows operational and regulatory need. Contact support for access or deletion requests under the Nigeria Data Protection Regulation."
    />
  );
}
