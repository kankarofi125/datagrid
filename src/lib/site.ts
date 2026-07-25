import type { Metadata } from "next";

export const SITE_NAME = "DataGrid";
export const SITE_ORIGIN = resolveSiteOrigin();
export const SITE_DESCRIPTION =
  "Buy data, airtime, electricity tokens, cable TV and exam pins in Nigeria with fast delivery, clear receipts and secure wallet payments.";
export const SOCIAL_IMAGE_PATH = "/opengraph-image";
export const LOGO_PATH = "/brand/datagrid-mark.svg";

function resolveSiteOrigin() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    "https://datagrid-gilt.vercel.app";

  try {
    const url = new URL(configured);
    return url.origin;
  } catch {
    return "https://datagrid-gilt.vercel.app";
  }
}

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_ORIGIN}/`).toString();
}

export function createPublicMetadata({
  title,
  description,
  path,
  keywords,
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
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
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_NG",
      type: "website",
      images: [
        {
          url: SOCIAL_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — digital essentials for Nigeria`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SOCIAL_IMAGE_PATH],
    },
  };
}
