// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://nextpostai.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Add disallows if you have private paths, e.g.:
      // disallow: ["/api/", "/admin", "/dashboard"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
