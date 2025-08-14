// app/sitemap.ts
import type { MetadataRoute } from "next";

const siteUrl = "https://nextpostai.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Add/replace with your real routes
  const staticPaths = ["", "/blogs"].map(
    (p) => ({
      url: `${siteUrl}${p}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.8,
    })
  );

  // Example: dynamic blog routes (replace with your data fetch)
  // const posts = await fetchPosts();
  // const postEntries = posts.map((slug) => ({
  //   url: `${siteUrl}/blog/${slug}`,
  //   lastModified: now,
  //   changeFrequency: "weekly" as const,
  //   priority: 0.6,
  // }));

  return [...staticPaths /*, ...postEntries */];
}
