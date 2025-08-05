"use server";

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

export interface BlogPost {
  slug: string;
  title: string;
  summary: string;
  date: string;
  content: string;
  thumbnail?: string;
}

const blogsDirectory = join(process.cwd(), "src/contents/blogs");

export async function getAllBlogSlugs(): Promise<string[]> {
  try {
    const fileNames = readdirSync(blogsDirectory);
    return fileNames
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.replace(/\.md$/, ""));
  } catch {
    return [];
  }
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const fullPath = join(blogsDirectory, `${slug}.md`);
    const fileContents = readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title || "Untitled",
      summary: data.summary || "",
      date: data.date || "",
      thumbnail: data.thumbnail || null,
      content: await marked(content),
    };
  } catch {
    return null;
  }
}

export async function getAllBlogs(): Promise<BlogPost[]> {
  const slugs = await getAllBlogSlugs();
  const blogs = await Promise.all(
    slugs.map(async (slug) => getBlogBySlug(slug))
  );
  return blogs
    .filter((blog): blog is BlogPost => blog !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getRecentBlogs(count = 3): Promise<BlogPost[]> {
  const blogs = await getAllBlogs();
  return blogs.slice(0, count);
}
