import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { BlockingLoaderProvider } from "@/components/ui/BlockingLoader";
import { HapticFeedback } from "@/components/ui/HapticFeedback";
import {
  absoluteUrl,
  LOGO_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  SOCIAL_IMAGE_PATH,
} from "@/lib/site";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "DataGrid Nigeria — Buy Data, Airtime & Pay Bills",
    template: "%s · DataGrid",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_ORIGIN }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "financial technology",
  keywords: [
    "buy data Nigeria",
    "buy airtime online Nigeria",
    "cheap data plans Nigeria",
    "MTN data",
    "Airtel data",
    "Glo data",
    "9mobile data",
    "electricity token Nigeria",
    "DStv payment",
    "GOtv payment",
    "WAEC result checker",
    "VTU Nigeria",
  ],
  referrer: "origin-when-cross-origin",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "DataGrid Nigeria — Buy Data, Airtime & Pay Bills",
    description: SITE_DESCRIPTION,
    url: SITE_ORIGIN,
    siteName: SITE_NAME,
    locale: "en_NG",
    type: "website",
    images: [
      {
        url: SOCIAL_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "DataGrid — digital essentials for Nigeria",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DataGrid Nigeria — Buy Data, Airtime & Pay Bills",
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE_PATH],
  },
  manifest: "/manifest.webmanifest",
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? {
          other: {
            "msvalidate.01": process.env.BING_SITE_VERIFICATION,
          },
        }
      : {}),
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DataGrid",
  },
  other: {
    "theme-color": "#04291C",
    "geo.region": "NG",
    "geo.placename": "Nigeria",
    "mobile-web-app-capable": "yes",
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
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl(LOGO_PATH),
          width: 512,
          height: 512,
        },
        description: SITE_DESCRIPTION,
        areaServed: {
          "@type": "Country",
          name: "Nigeria",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        description: SITE_DESCRIPTION,
        inLanguage: "en-NG",
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_ORIGIN}/#webapp`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        description: SITE_DESCRIPTION,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript and a modern web browser",
        inLanguage: "en-NG",
        areaServed: {
          "@type": "Country",
          name: "Nigeria",
        },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "NGN",
          description: "No fee to create a DataGrid account",
        },
        featureList: [
          "Mobile data purchases",
          "Airtime purchases",
          "Electricity token payments",
          "Cable television payments",
          "Digital receipts",
        ],
      },
    ],
  };

  return (
    <html
      lang="en-NG"
      data-scroll-behavior="smooth"
      className={`${anton.variable} ${instrument.variable} ${plex.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" href="/media/scroll/poster.jpg" as="image" />
        <noscript>
          <style>{`
            [data-motion-owned] {
              opacity: 1 !important;
              transform: none !important;
              filter: none !important;
            }
          `}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <BlockingLoaderProvider>
          <HapticFeedback />
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
        </BlockingLoaderProvider>
      </body>
    </html>
  );
}
