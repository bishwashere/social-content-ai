import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const ideasDirectory = join(process.cwd(), "content/ideas");

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
    const fileNames = readdirSync(ideasDirectory);
    const mdxFiles = fileNames.filter((name) => name.endsWith(".mdx"));
    
    const slugs = await Promise.all(
      mdxFiles.map(async (fileName) => {
        try {
          const fullPath = join(ideasDirectory, fileName);
          const fileContents = readFileSync(fullPath, "utf8");
          const { data } = matter(fileContents);
          const title = data.title || "Untitled";
          return titleToSlug(title);
        } catch {
          // Fallback to filename if reading fails
          return fileName.replace(/\.mdx$/, "");
        }
      })
    );
    
    return slugs;
  } catch {
    return [];
  }
}

export async function getIdeaBySlug(slug: string): Promise<IdeaPost | null> {
  try {
    // First, try to find by filename (for backward compatibility)
    try {
      const fullPath = join(ideasDirectory, `${slug}.mdx`);
      const fileContents = readFileSync(fullPath, "utf8");
      const { data, content } = matter(fileContents);
      const titleSlug = titleToSlug(data.title || "Untitled");
      
      // If the slug matches the title-based slug, return it
      if (titleSlug === slug) {
        return {
          slug: titleSlug,
          title: data.title || "Untitled",
          summary: data.summary || "",
          publishedAt: data.publishedAt || data.date || "",
          tags: data.tags || [],
          thumbnail: data.thumbnail || null,
          content,
        };
      }
    } catch {
      // Continue to search by title
    }
    
    // Search all files to find one with matching title-based slug
    const fileNames = readdirSync(ideasDirectory);
    const mdxFiles = fileNames.filter((name) => name.endsWith(".mdx"));
    
    for (const fileName of mdxFiles) {
      try {
        const fullPath = join(ideasDirectory, fileName);
        const fileContents = readFileSync(fullPath, "utf8");
        const { data, content } = matter(fileContents);
        const titleSlug = titleToSlug(data.title || "Untitled");
        
        if (titleSlug === slug) {
          return {
            slug: titleSlug,
            title: data.title || "Untitled",
            summary: data.summary || "",
            publishedAt: data.publishedAt || data.date || "",
            tags: data.tags || [],
            thumbnail: data.thumbnail || null,
            content,
          };
        }
      } catch {
        continue;
      }
    }
    
    return null;
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

          const titleSlug = titleToSlug(data.title || "Untitled");
          return {
            slug: titleSlug,
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
export interface BlogPost extends IdeaPost {
  date?: string; // Legacy field for backward compatibility
}
export const getAllBlogSlugs = getAllIdeaSlugs;
export const getBlogBySlug = getIdeaBySlug;
export const getAllBlogs = getAllIdeas;
export const getRecentBlogs = getRecentIdeas;
