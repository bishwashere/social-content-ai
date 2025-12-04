import type { MetadataRoute } from "next";
import { getAllIdeas } from "@/lib/blogs";

const siteUrl = "https://nextpostai.com";

export default async function ideasSitemap(): Promise<MetadataRoute.Sitemap> {
  const ideas = await getAllIdeas();

  const ideaEntries = ideas.map((idea) => ({
    url: `${siteUrl}/ideas/${idea.slug}`,
    lastModified: new Date(idea.publishedAt).toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return ideaEntries;
}
