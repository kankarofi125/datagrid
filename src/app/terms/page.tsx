import type { Metadata } from "next";
import {
  LegalClient,
  type LegalSection,
} from "@/components/marketing/LegalClient";

const effectiveDate = "25 July 2026";
const contactEmail =
  process.env.NEXT_PUBLIC_LEGAL_EMAIL || "privacy@datagrid.ng";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing DataGrid accounts, Google login, wallets, digital-service transactions, refunds, reseller tools, and acceptable use.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "DataGrid Terms of Service",
    description:
      "Terms for DataGrid accounts, wallets, transactions, receipts, and Google login.",
    url: "/terms",
    type: "website",
  },
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement and scope",
    paragraphs: [
      "These Terms of Service (“Terms”) govern access to and use of the DataGrid website, progressive web application, customer account, wallet, digital-service checkout, reseller tools, schedules, receipts, support, and related features. By creating an account, signing in, funding a wallet, placing an order, or otherwise using DataGrid, you agree to these Terms and the Privacy Policy.",
      "If you do not agree, do not use the service. Additional terms displayed for a specific payment provider, network, biller, reseller feature, or promotion also apply to that feature.",
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility and account responsibility",
    paragraphs: [
      "You must have legal capacity to enter this agreement and must provide accurate, current information. A person below the age of legal capacity may use DataGrid only through a parent or legal guardian who accepts responsibility for the account and transactions.",
    ],
    bullets: [
      "Keep your registered phone, OTPs, PIN, Google account, device, session, API keys, and recovery access secure.",
      "Do not share authentication credentials or allow another person to impersonate you.",
      "Notify support promptly if you suspect unauthorised access or an incorrect account link.",
      "You are responsible for activity authorised through your credentials, subject to applicable consumer law and our investigation of reported fraud.",
    ],
  },
  {
    id: "google",
    title: "Google login",
    highlight: true,
    paragraphs: [
      "Google login is an optional authentication method. DataGrid requests only openid, email, and profile. A first-time Google user must verify a Nigerian phone number before the Google identity is linked to a DataGrid wallet account.",
      "Your use of Google services is also governed by Google’s own terms and policies. Revoking DataGrid in your Google Account stops future Google authentication but does not automatically close your DataGrid account or erase transaction records. Follow the deletion instructions in the Privacy Policy to request unlinking or account deletion.",
    ],
  },
  {
    id: "services",
    title: "Digital services and order details",
    paragraphs: [
      "DataGrid facilitates purchases from telecommunications networks, electricity distributors, cable providers, exam bodies, payment processors, and other service providers. Availability, plan names, validity, delivery time, and provider rules may change.",
    ],
    bullets: [
      "Review the recipient number, network, meter or smartcard number, package, amount, customer name, and other order details before confirming.",
      "You are responsible for incorrect recipient or account details you submit when the service is successfully delivered as instructed.",
      "Network detection and customer-name validation are assistance tools; you must still confirm the displayed details.",
      "Scheduled purchases execute using the instructions and wallet balance available at the scheduled time and may fail when funds, plans, providers, or validation are unavailable.",
    ],
  },
  {
    id: "wallet",
    title: "Wallet, funding, and payments",
    paragraphs: [
      "The DataGrid wallet is a stored transaction balance used to purchase services on the platform. It is not a bank account, savings product, deposit account, investment, or credit facility, and it does not earn interest.",
      "Wallet funding and settlement may be handled by third-party payment processors or banks under their terms. Funding may be delayed, reversed, reviewed, or rejected because of provider status, fraud controls, chargebacks, duplicate references, legal obligations, or reconciliation requirements.",
    ],
  },
  {
    id: "authorisation",
    title: "Transaction authorisation",
    paragraphs: [
      "Submitting the correct transaction PIN, authenticated session, reseller API key, or other confirmation method authorises DataGrid to debit the applicable wallet and attempt the selected purchase. Never disclose your PIN, OTP, token, or API secret to anyone claiming to be DataGrid support.",
      "Prices, fees, and the total debit are shown before confirmation where applicable. You authorise the amount displayed at confirmation. Provider pricing or availability may change before a future scheduled order runs.",
    ],
  },
  {
    id: "delivery-refunds",
    title: "Delivery, failures, and refunds",
    paragraphs: [
      "A transaction marked delivered is treated as completed using the provider response and audit trail. Successfully delivered digital value is generally final and cannot be recalled or refunded merely because the wrong eligible recipient details were entered.",
      "When a provider attempt fails after a wallet debit, DataGrid is designed to return the affected amount to the wallet. Reconciliation may be required where a provider response is delayed, ambiguous, duplicated, or later reversed. Contact support with the order reference if the displayed status does not match the recipient’s result.",
      "A receipt records the platform’s transaction status and reference. It is not a bank statement or independent confirmation from a network, biller, or government authority.",
    ],
  },
  {
    id: "resellers",
    title: "Reseller and API use",
    paragraphs: [
      "Agent pricing, commissions, referrals, and API access are conditional privileges, not guaranteed entitlements. DataGrid may set volume thresholds, rate limits, scopes, pricing, fraud controls, and programme rules.",
    ],
    bullets: [
      "Protect API keys and rotate or revoke them if exposed.",
      "Do not misrepresent your relationship with DataGrid or make unsupported delivery, pricing, or refund promises.",
      "Do not use reseller tools for spam, unlawful automation, credential sharing, account farming, or attempts to bypass rate, wallet, or security controls.",
      "Commissions may be corrected where the underlying transaction is refunded, reversed, fraudulent, duplicated, or calculated in error.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    paragraphs: [
      "You must use DataGrid lawfully and in a way that does not harm users, providers, networks, or the platform.",
    ],
    bullets: [
      "Do not commit fraud, money laundering, identity theft, account takeover, chargeback abuse, or unauthorised payment activity.",
      "Do not probe, scrape, overload, reverse engineer, bypass access controls, interfere with delivery, or introduce malicious code.",
      "Do not use another person’s information without authority or purchase services for unlawful, deceptive, or abusive purposes.",
      "Do not exploit pricing, referral, commission, provider, validation, or technical errors. Report suspected errors to support.",
    ],
  },
  {
    id: "third-parties",
    title: "Third-party services and availability",
    paragraphs: [
      "DataGrid depends on networks, billers, banks, payment processors, cloud infrastructure, messaging providers, and other third parties. We work to provide reliable routing and status information, but cannot guarantee uninterrupted availability or control a third party’s systems, maintenance, coverage, reversal rules, or processing time.",
      "Planned maintenance, emergencies, security incidents, provider outages, connectivity failures, government action, and events beyond reasonable control may temporarily limit service.",
    ],
  },
  {
    id: "suspension",
    title: "Suspension and termination",
    paragraphs: [
      "DataGrid may restrict, suspend, investigate, or close an account when reasonably necessary to protect users or the service, comply with law, respond to a provider or regulator, investigate suspected fraud, address unpaid or reversed funds, or enforce these Terms.",
      "You may stop using DataGrid and request account deletion or Google unlinking as described in the Privacy Policy. Closure does not remove obligations, completed transactions, disputes, or records that must lawfully be retained.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Platform rights",
    paragraphs: [
      "DataGrid’s software, design, branding, content, documentation, and service arrangement are owned by or licensed to DataGrid and protected by applicable law. These Terms grant only a limited, revocable, non-transferable right to use the service for its intended purpose. Third-party names and marks remain the property of their respective owners.",
    ],
  },
  {
    id: "liability",
    title: "Disclaimers and responsibility",
    paragraphs: [
      "DataGrid will exercise reasonable care in operating the platform. To the extent permitted by law, the service is provided subject to availability and we are not responsible for indirect, incidental, special, or consequential loss arising from third-party outages, user-entered errors, unauthorised credential sharing, or events beyond reasonable control.",
      "Nothing in these Terms excludes liability or consumer rights that cannot lawfully be excluded. Any responsibility will be assessed in light of the transaction, the platform audit trail, provider records, your actions, and applicable law.",
    ],
  },
  {
    id: "law",
    title: "Governing law and disputes",
    paragraphs: [
      `These Terms are governed by the laws of the Federal Republic of Nigeria. Contact ${contactEmail} or support first with the relevant order reference so we can investigate and attempt an efficient resolution. Nothing here prevents either party from using a competent regulator, consumer-protection body, court, or other remedy available under applicable law.`,
    ],
  },
  {
    id: "changes",
    title: "Changes and contact",
    paragraphs: [
      `We may update these Terms to reflect legal, security, provider, or product changes. The updated version will be posted at this permanent URL with a revised effective date. Material changes may also be communicated in the application. Questions about these Terms may be sent to ${contactEmail}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalClient
      documentLabel="Legal · Service agreement"
      title="CLEAR TERMS. NO SURPRISES."
      summary="The rules for DataGrid accounts, Google login, wallets, digital purchases, refunds, schedules, reseller tools, and responsible platform use."
      effectiveDate={effectiveDate}
      contactEmail={contactEmail}
      sections={sections}
    />
  );
}
