import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    default: "DataGrid — Airtime, Data & Bills in Seconds",
    template: "%s · DataGrid",
  },
  description:
    "Nigeria's national grid for your phone. Buy airtime, data, electricity tokens, cable TV, and more. Reseller wholesale rates. Guest checkout.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "DataGrid — DATA IN TEN SECONDS.",
    description: "Airtime, data, power tokens, cable. Control-room reliable VTU for Nigeria.",
    url: siteUrl,
    siteName: "DataGrid",
    locale: "en_NG",
    type: "website",
    images: [{ url: "/media/og/og-default.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DataGrid",
    description: "DATA IN TEN SECONDS. LIGHT IN TWENTY.",
    images: ["/media/og/og-default.jpg"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DataGrid",
  },
  other: {
    "theme-color": "#04291C",
  },
};

export const viewport: Viewport = {
  themeColor: "#04291C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DataGrid",
    url: siteUrl,
    description: "Nigerian airtime, data and bills payment platform",
    areaServed: "NG",
  };

  return (
    <html
      lang="en-NG"
      className={`${anton.variable} ${instrument.variable} ${plex.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" href="/media/scroll/poster.jpg" as="image" />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <RegisterSW />
        <InstallPrompt />
      </body>
    </html>
  );
}
