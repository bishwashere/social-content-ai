import type { MetadataRoute } from "next";
import { SITE_URL as siteUrl } from "@/constants/common";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Add disallows if you have private paths, e.g.:
      // disallow: ["/api/", "/admin", "/dashboard"],
    },
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/ideas-sitemap.xml`,
    ],
    host: siteUrl,
  };
}
