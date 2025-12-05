import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { prisma } from "@/lib/prisma";

/**
 * POST /ideas/receive
 * Webhook endpoint to receive blog posts from Blog News campaigns and publish them as ideas
 */
export const POST = applyMiddleware(
  catchApiAsyncError(async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Validate webhook payload structure
      if (!body.blog || !body.blog.title || !body.blog.content) {
        return sendNextResponse({
          status: 400,
          message: "Invalid payload: blog.title and blog.content are required",
        });
      }

      const { day, blog, timestamp } = body;
      const { title, content, tags, sourceArticle } = blog;

      // Get first user as default author
      const firstUser = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
      });

      if (!firstUser) {
        return sendNextResponse({
          status: 400,
          message: "No users found in database. Please create a user first.",
        });
      }

      // Generate slug from title (used in URL: /ideas/title-of-post)
      const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

      // Check if slug already exists
      const existingIdea = await prisma.idea.findUnique({
        where: { slug },
      });

      if (existingIdea) {
        // If article already exists, update it instead of creating duplicate
        // Generate summary from content (strip markdown, take first 200 chars)
        const plainTextContent = content
          .replace(/#{1,6}\s+/g, "") // Remove markdown headers
          .replace(/\*\*/g, "") // Remove bold markers
          .replace(/\*/g, "") // Remove italic markers
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Convert links to text
          .replace(/\n+/g, " ") // Replace newlines with spaces
          .trim();
        
        const summary = plainTextContent.slice(0, 200) + (plainTextContent.length > 200 ? "..." : "");

        const updatedIdea = await prisma.idea.update({
          where: { id: existingIdea.id },
          data: {
            title,
            content,
            tags: tags || [],
            summary: summary || "Blog post from NextPost AI",
            status: "published" as "published",
            publishedAt: timestamp ? new Date(timestamp) : new Date(),
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        });

        // Revalidate paths
        revalidatePath("/ideas");
        revalidatePath(`/ideas/${slug}`);
        revalidatePath("/ideas-sitemap.xml");
        revalidatePath("/sitemap.xml");
        revalidatePath("/get");
        revalidatePath("/");

        return sendNextResponse({
          status: 200,
          data: updatedIdea,
          message: "Idea updated successfully",
        });
      }

      // Generate summary from content (strip markdown, take first 200 chars)
      const plainTextContent = content
        .replace(/#{1,6}\s+/g, "") // Remove markdown headers
        .replace(/\*\*/g, "") // Remove bold markers
        .replace(/\*/g, "") // Remove italic markers
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Convert links to text
        .replace(/\n+/g, " ") // Replace newlines with spaces
        .trim();
      
      const summary = plainTextContent.slice(0, 200) + (plainTextContent.length > 200 ? "..." : "");

      // Create new idea
      const idea = await prisma.idea.create({
        data: {
          slug,
          title,
          summary: summary || "Blog post from NextPost AI",
          content,
          tags: tags || [],
          thumbnail: null, // No thumbnail from webhook
          status: "published" as "published",
          publishedAt: timestamp ? new Date(timestamp) : new Date(),
          authorId: firstUser.id,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Revalidate paths when idea is published
      revalidatePath("/ideas");
      revalidatePath(`/ideas/${slug}`);
      revalidatePath("/ideas-sitemap.xml");
      revalidatePath("/sitemap.xml");
      revalidatePath("/get"); // Homepage with recent ideas
      revalidatePath("/"); // Root homepage if it shows ideas

      return sendNextResponse({
        status: 201,
        data: idea,
        message: "Idea created and published successfully",
      });
    } catch (error) {
      console.error("Error receiving webhook:", error);
      return sendNextResponse({
        status: 500,
        message: error instanceof Error ? error.message : "Internal server error",
      });
    }
  })
);

