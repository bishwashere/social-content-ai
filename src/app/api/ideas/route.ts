import { NextRequest } from "next/server";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { validateIdeasAdminAuth } from "@/middlewares/validate-ideas-admin-auth";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ideas
 * Get all published ideas (public) or all ideas for admin
 */
export const GET = applyMiddleware(
  catchApiAsyncError(async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const includeDrafts = searchParams.get("includeDrafts") === "true";

    // Check if ideas admin is authenticated
    let isIdeasAdmin = false;
    try {
      await validateIdeasAdminAuth({ errorIfNotAuthenticated: false })(req);
      // @ts-expect-error: parsed is not defined in Request type
      if (req.parsed?.ideasAdmin) {
        isIdeasAdmin = true;
      }
    } catch {
      // Not admin, continue as public user
    }

    // Build where clause
    let where: any = {};
    
    if (!includeDrafts || !isIdeasAdmin) {
      // Public users or if includeDrafts is false: only show published
      where.status = "published";
    } else if (includeDrafts && isIdeasAdmin) {
      // Ideas admin with includeDrafts: show all (published + drafts)
      where = {};
    }

    const ideas = await prisma.idea.findMany({
      where,
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
      orderBy: {
        publishedAt: "desc",
      },
    });

    return sendNextResponse({
      status: 200,
      data: ideas,
      message: "Ideas fetched successfully",
    });
  })
);

/**
 * POST /api/ideas
 * Create a new idea (ideas admin only)
 */
export const POST = applyMiddleware(
  validateIdeasAdminAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req: NextRequest) => {
    const body = await req.json();
    const { title, summary, content, tags, thumbnail, status, publishedAt, authorId } = body;

    // Get first user as default author if not provided
    let finalAuthorId = authorId;
    if (!finalAuthorId) {
      const firstUser = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (!firstUser) {
        return sendNextResponse({
          status: 400,
          message: "No users found in database. Please create a user first.",
        });
      }
      finalAuthorId = firstUser.id;
    }

    if (!title || !content) {
      return sendNextResponse({
        status: 400,
        message: "Title and content are required",
      });
    }

    // Generate slug from title (used in URL: /api/ideas/title-of-post)
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
      return sendNextResponse({
        status: 400,
        message: "An idea with this title already exists",
      });
    }

    const idea = await prisma.idea.create({
      data: {
        slug,
        title,
        summary: summary || "",
        content,
        tags: tags || [],
        thumbnail: thumbnail || null,
        status: (status === "published" ? "published" : "draft") as "draft" | "published",
        publishedAt: status === "published" ? (publishedAt ? new Date(publishedAt) : new Date()) : null,
        authorId: finalAuthorId,
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

    return sendNextResponse({
      status: 201,
      data: idea,
      message: "Idea created successfully",
    });
  })
);
