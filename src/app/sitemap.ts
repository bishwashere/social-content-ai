import type { MetadataRoute } from "next";

const siteUrl = "https://nextpostai.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Primary sitemap with main routes
  const staticPaths = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/ideas`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/ideas-sitemap.xml`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    },
  ];

  return staticPaths;
}
