import { prisma } from "@/lib/prisma";

// Convert title to URL-friendly slug
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

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
    const ideas = await prisma.idea.findMany({
      where: {
        status: "published",
      },
      select: {
        slug: true,
      },
    });
    
    return ideas.map((idea) => idea.slug);
  } catch {
    return [];
  }
}

export async function getIdeaBySlug(slug: string): Promise<IdeaPost | null> {
  try {
    const idea = await prisma.idea.findFirst({
      where: {
        slug,
        status: "published",
      },
    });

    if (!idea) {
      return null;
    }

    return {
      slug: idea.slug,
      title: idea.title,
      summary: idea.summary,
      publishedAt: idea.publishedAt?.toISOString() || new Date().toISOString(),
      tags: idea.tags,
      thumbnail: idea.thumbnail || undefined,
      content: idea.content, // Raw MDX/Markdown content
    };
  } catch {
    return null;
  }
}

export async function getAllIdeas(): Promise<IdeaPost[]> {
  try {
    const ideas = await prisma.idea.findMany({
      where: {
        status: "published",
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    return ideas.map((idea) => ({
      slug: idea.slug,
      title: idea.title,
      summary: idea.summary,
      publishedAt: idea.publishedAt?.toISOString() || new Date().toISOString(),
      tags: idea.tags,
      thumbnail: idea.thumbnail || undefined,
      content: idea.content, // Raw MDX/Markdown content
    }));
  } catch {
    return [];
  }
}

export async function getRecentIdeas(count = 3): Promise<IdeaPost[]> {
  const allIdeas = await getAllIdeas();
  return allIdeas.slice(0, count);
}

// Legacy aliases for backward compatibility during migration
export interface BlogPost extends IdeaPost {
  date?: string; // Legacy field for backward compatibility
}
export const getAllBlogSlugs = getAllIdeaSlugs;
export const getBlogBySlug = getIdeaBySlug;
export const getAllBlogs = getAllIdeas;
export const getRecentBlogs = getRecentIdeas;
