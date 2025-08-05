export interface BlogPost {
  slug: string;
  title: string;
  summary: string;
  date: string;
  content: string;
  thumbnail?: string;
}

export async function getAllBlogSlugs(): Promise<string[]> {
  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL + "/api/blogs"
    );
    const blogs = await response.json();
    return blogs.map((blog: BlogPost) => blog.slug);
  } catch {
    return [];
  }
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL}/api/blogs?slug=${slug}`
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function getAllBlogs(): Promise<BlogPost[]> {
  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL + "/api/blogs"
    );
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export async function getRecentBlogs(count = 3): Promise<BlogPost[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL}/api/blogs?recent=true&count=${count}`
    );
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}
