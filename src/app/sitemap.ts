import type { MetadataRoute } from "next";
import { SITE_URL as siteUrl } from "@/constants/common";

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
    // Documentation pages
    {
      url: `${siteUrl}/documentation`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${siteUrl}/documentation/security`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/documentation/platforms`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/documentation/platforms/facebook`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/platforms/instagram`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/platforms/linkedin`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/platforms/twitter`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/platforms/tiktok`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/platforms/threads`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/platforms/reddit`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/features`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/documentation/features/quick-generate`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/features/campaign-planner`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/features/blog-news`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/features/webhooks`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/features/scheduled-posts`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/documentation/features/advanced-customization`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ];

  return staticPaths;
}
