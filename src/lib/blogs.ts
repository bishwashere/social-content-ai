import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const ideasDirectory = join(process.cwd(), "content/ideas");

export interface IdeaPost {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  content: string; // Raw MDX content for RSC rendering
  tags?: string[];
  thumbnail?: string;
}

export async function getAllIdeaSlugs(): Promise<string[]> {
  try {
    const fileNames = readdirSync(ideasDirectory);
    return fileNames
      .filter((name) => name.endsWith(".mdx"))
      .map((name) => name.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}

export async function getIdeaBySlug(slug: string): Promise<IdeaPost | null> {
  try {
    const fullPath = join(ideasDirectory, `${slug}.mdx`);
    const fileContents = readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    return {
      slug: data.slug || slug,
      title: data.title || "Untitled",
      summary: data.summary || "",
      publishedAt: data.publishedAt || data.date || "",
      tags: data.tags || [],
      thumbnail: data.thumbnail || null,
      content, // Return raw content for MDXRemote to process
    };
  } catch {
    return null;
  }
}

export async function getAllIdeas(): Promise<IdeaPost[]> {
  try {
    const fileNames = readdirSync(ideasDirectory);
    const slugs = fileNames
      .filter((name) => name.endsWith(".mdx"))
      .map((name) => name.replace(/\.mdx$/, ""));

    const ideas = await Promise.all(
      slugs.map(async (slug) => {
        try {
          const fullPath = join(ideasDirectory, `${slug}.mdx`);
          const fileContents = readFileSync(fullPath, "utf8");
          const { data, content } = matter(fileContents);

          return {
            slug: data.slug || slug,
            title: data.title || "Untitled",
            summary: data.summary || "",
            publishedAt: data.publishedAt || data.date || "",
            tags: data.tags || [],
            thumbnail: data.thumbnail || null,
            content, // Return raw content for MDXRemote to process
          };
        } catch (error) {
          console.error(`Error processing idea file ${slug}:`, error);
          return null;
        }
      })
    );

    const sortedIdeas = ideas
      .filter((idea): idea is NonNullable<typeof idea> => idea !== null)
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

    return sortedIdeas;
  } catch {
    return [];
  }
}

export async function getRecentIdeas(count = 3): Promise<IdeaPost[]> {
  const allIdeas = await getAllIdeas();
  return allIdeas.slice(0, count);
}

// Legacy aliases for backward compatibility during migration
export type BlogPost = IdeaPost;
export const getAllBlogSlugs = getAllIdeaSlugs;
export const getBlogBySlug = getIdeaBySlug;
export const getAllBlogs = getAllIdeas;
export const getRecentBlogs = getRecentIdeas;
