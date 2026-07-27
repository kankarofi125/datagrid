import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/about",
        "/privacy",
        "/rates",
        "/rates/",
        "/support",
        "/terms",
      ],
      disallow: [
        "/api/",
        "/admin",
        "/auth/",
        "/login",
        "/signup",
        "/dashboard",
        "/wallet",
        "/settings",
        "/history",
        "/analytics",
        "/agent",
        "/referrals",
        "/schedules",
        "/services",
        "/buy",
        "/legal/",
      ],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
