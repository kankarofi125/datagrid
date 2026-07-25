import type { Metadata } from "next";
import {
  LegalClient,
  type LegalSection,
} from "@/components/marketing/LegalClient";

const effectiveDate = "25 July 2026";
const contactEmail =
  process.env.NEXT_PUBLIC_LEGAL_EMAIL || "privacy@datagrid.ng";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How DataGrid collects, uses, shares, protects, retains, and deletes personal information, including Google sign-in data.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "DataGrid Privacy Policy",
    description:
      "A clear explanation of how DataGrid handles personal information and Google sign-in data.",
    url: "/privacy",
    type: "website",
  },
};

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Who we are and what this policy covers",
    paragraphs: [
      `DataGrid (“DataGrid”, “we”, “us”, or “our”) provides digital airtime, data, bill-payment, wallet, reseller, scheduling, support, and receipt services in Nigeria. This Privacy Policy explains how we process personal information when you visit our website, use our progressive web application, create an account, sign in with Google, fund a wallet, purchase a service, use our reseller tools, or contact support.`,
      `DataGrid is responsible for the personal information described in this policy. Privacy questions and data-rights requests may be sent to ${contactEmail}.`,
    ],
  },
  {
    id: "google-data",
    title: "Google sign-in data",
    highlight: true,
    paragraphs: [
      "When you choose “Continue with Google”, Google authenticates you and provides DataGrid with the minimum account information needed to identify and sign you in.",
      "DataGrid requests only the OpenID Connect scopes openid, email, and profile. We use this information solely to authenticate you, link your Google identity to the DataGrid account secured by your verified Nigerian phone number, display basic profile information, prevent account abuse, and support account recovery.",
    ],
    bullets: [
      "Information received: your stable Google account identifier (sub), verified email address, display name, and profile image when Google supplies one.",
      "Information not requested: your Google password, Gmail messages, Google Drive files, contacts, calendar, photos, payment data, or other Google product content.",
      "DataGrid does not sell Google user data, use it for advertising, or permit humans to read private Google product content. We do not request access to such content.",
      "OAuth state, nonce, and PKCE verification values are short-lived security data and expire after approximately ten minutes.",
      "You may stop using Google sign-in through your Google Account’s third-party connections page. Revoking Google access prevents future Google authentication but does not itself delete records DataGrid must retain; use the deletion process below for that.",
    ],
  },
  {
    id: "information-collected",
    title: "Other information we collect",
    paragraphs: [
      "The information we process depends on the features you use. We limit collection to information reasonably needed to operate, secure, and improve the service.",
    ],
    bullets: [
      "Account and authentication data: Nigerian phone number, OTP verification records, encrypted or hashed PIN credentials, name, email, role, referral relationship, account status, and session information.",
      "Transaction and wallet data: service purchased, recipient number, network or biller, amount, wallet movements, provider references, order status, receipts, refund records, beneficiaries, and scheduled top-ups.",
      "Payment and compliance data: funding method, payment-provider references, virtual-account details, and optional identity or KYC information when required for a feature or by law.",
      "Support and communications data: messages, disputes, notifications, support tickets, and information you choose to provide when requesting help.",
      "Technical and security data: IP address, device or browser information, timestamps, diagnostics, audit events, and fraud-prevention signals.",
    ],
  },
  {
    id: "use",
    title: "How and why we use information",
    paragraphs: [
      "We process information to perform our contract with you, comply with legal obligations, protect legitimate security and operational interests, and obtain consent where required.",
    ],
    bullets: [
      "Create, authenticate, secure, and maintain your account.",
      "Process wallet funding, airtime, data, electricity, cable, exam PIN, transfer, reseller, and scheduled transactions.",
      "Detect fraud, prevent abuse, enforce limits, investigate disputes, and maintain reliable audit trails.",
      "Provide receipts, notifications, customer support, service status, refunds, and account recovery.",
      "Meet accounting, tax, telecommunications, anti-fraud, consumer-protection, data-protection, and other lawful requirements.",
      "Measure reliability and improve user-facing functionality without selling personal information.",
    ],
  },
  {
    id: "sharing",
    title: "When information is shared",
    paragraphs: [
      "We disclose only information reasonably necessary for the recipient to perform a defined service, complete your request, protect the platform, or satisfy law.",
    ],
    bullets: [
      "Google, when you initiate Google authentication, subject to Google’s own privacy terms.",
      "Payment processors, banks, wallet or virtual-account providers needed to fund or settle a transaction.",
      "Telecommunications networks, billers, exam bodies, and VTU service providers needed to validate or deliver your purchase.",
      "Cloud hosting, database, cache, security, communications, OTP, monitoring, and support vendors acting for DataGrid under appropriate safeguards.",
      "Regulators, courts, law-enforcement bodies, professional advisers, or counterparties where disclosure is legally required or necessary to protect rights and safety.",
      "A successor in a merger, financing, reorganisation, or sale, subject to continued protection and applicable notice requirements.",
    ],
  },
  {
    id: "retention",
    title: "Retention and deletion",
    paragraphs: [
      "We retain information only for as long as reasonably necessary for the purposes described here, including service delivery, security, fraud prevention, dispute resolution, accounting, regulatory obligations, and the establishment or defence of legal claims.",
      "Google profile and linking information is retained while your Google identity remains linked to an active DataGrid account. Session cookies ordinarily expire after fourteen days; OAuth verification cookies expire after approximately ten minutes. Transaction, wallet, receipt, KYC, dispute, and audit records may be retained after account closure when law, fraud controls, financial reconciliation, or legitimate claims require it.",
      `To request account deletion or removal of your Google link, email ${contactEmail} from your registered email address or contact support from your authenticated account. Include your registered phone number and state whether you want Google unlinked or the entire account deleted. We may verify your identity before acting. We will delete or anonymise information that is no longer required and explain any lawful retention that applies.`,
    ],
  },
  {
    id: "rights",
    title: "Your privacy rights",
    paragraphs: [
      "Subject to the Nigeria Data Protection Act 2023 and other applicable law, you may have rights concerning your personal information.",
    ],
    bullets: [
      "Be informed about processing and request access to personal information we hold about you.",
      "Correct inaccurate or incomplete information.",
      "Request deletion, restriction, objection, or data portability where the relevant legal conditions apply.",
      "Withdraw consent where processing depends on consent, without affecting earlier lawful processing.",
      "Request human review where a significant decision is made solely through automated processing.",
      "Complain to DataGrid or lodge a complaint with the Nigeria Data Protection Commission.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "We use administrative, technical, and organisational safeguards designed to protect personal information. These include encrypted session cookies, server-side OAuth processing, signed Google-token verification, hashed PINs and OTPs, access controls, security headers, audit records, and restricted administrative access.",
      "No internet service can guarantee absolute security. Keep your phone, OTPs, PIN, recovery access, API keys, and transaction tokens private, and notify support promptly if you suspect unauthorised activity.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    paragraphs: [
      "DataGrid uses essential cookies and local browser storage to keep you signed in, protect authentication requests, remember necessary application preferences, support PWA installation choices, and maintain security. These technologies are required for core service operation. If non-essential analytics or advertising technologies are introduced, this policy and any required consent controls will be updated before they are used.",
    ],
  },
  {
    id: "transfers",
    title: "Service providers and international transfers",
    paragraphs: [
      "Some providers may process information outside Nigeria. Where personal information is transferred internationally, we use applicable contractual, legal, and organisational safeguards and limit transfers to what is necessary for the stated purpose.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "DataGrid is not directed to children who cannot lawfully agree to these services. If you are below the age of legal capacity, use DataGrid only with the involvement and permission of a parent or legal guardian. Contact us if you believe a child’s information was provided without appropriate authority.",
    ],
  },
  {
    id: "changes",
    title: "Changes and contact",
    paragraphs: [
      `We may update this policy to reflect changes in the service, law, providers, or security practices. The revised policy will be posted at this permanent URL with a new effective date. Material changes may also be communicated in the application. Questions, complaints, access requests, and deletion requests may be sent to ${contactEmail}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalClient
      documentLabel="Privacy · Data protection"
      title="PRIVACY, IN PLAIN LANGUAGE."
      summary="What DataGrid collects, why we need it, who receives it, how long it stays, and the choices you have—including when you sign in with Google."
      effectiveDate={effectiveDate}
      contactEmail={contactEmail}
      sections={sections}
    />
  );
}
