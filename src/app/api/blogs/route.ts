import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { NextResponse } from "next/server";

const blogsDirectory = join(process.cwd(), "src/contents/blogs");

export interface BlogPost {
  slug: string;
  title: string;
  summary: string;
  date: string;
  content: string;
  thumbnail?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const recent = searchParams.get("recent");
    const count = searchParams.get("count");

    if (slug) {
      const fullPath = join(blogsDirectory, `${slug}.md`);
      let fileContents;
      try {
        fileContents = readFileSync(fullPath, "utf8");
      } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error);
        return NextResponse.json(
          { error: `Failed to read blog file: ${slug}` },
          { status: 404 }
        );
      }
      const { data, content } = matter(fileContents);

      const blog = {
        slug,
        title: data.title || "Untitled",
        summary: data.summary || "",
        date: data.date || "",
        thumbnail: data.thumbnail || null,
        content: await marked(content),
      };

      return NextResponse.json(blog);
    }

    let fileNames;
    try {
      fileNames = readdirSync(blogsDirectory);
    } catch (error) {
      console.error(`Error reading blogs directory:`, error);
      return NextResponse.json(
        { error: "Failed to read blogs directory" },
        { status: 500 }
      );
    }
    const slugs = fileNames
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.replace(/\.md$/, ""));

    const blogs = await Promise.all(
      slugs.map(async (slug) => {
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
        } catch (error) {
          console.error(`Error processing blog file ${slug}:`, error);
          return null;
        }
      })
    );

    const sortedBlogs = blogs
      .filter((blog): blog is NonNullable<typeof blog> => blog !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (recent && count) {
      return NextResponse.json(sortedBlogs.slice(0, parseInt(count)));
    }

    return NextResponse.json(sortedBlogs);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch blogs" },
      { status: 500 }
    );
  }
}
