import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const legalLastModified = new Date("2026-07-25T00:00:00+01:00");
  const networks = ["mtn", "airtel", "glo", "9mobile"];

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/rates"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...networks.map(
      (network) =>
        ({
          url: absoluteUrl(`/rates/${network}`),
          lastModified,
          changeFrequency: "daily",
          priority: 0.8,
        }) satisfies MetadataRoute.Sitemap[number]
    ),
    {
      url: absoluteUrl("/privacy"),
      lastModified: legalLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: legalLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/about"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/support"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
