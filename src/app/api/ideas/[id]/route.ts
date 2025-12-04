import { NextRequest } from "next/server";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { validateIdeasAdminAuth } from "@/middlewares/validate-ideas-admin-auth";
import { CALL_NEXT_FUNCTION } from "@/middlewares/apply-middleware";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ideas/[id]
 * Get a single idea by ID or slug
 */
export const GET = applyMiddleware(
  validateIdeasAdminAuth({ errorIfNotAuthenticated: false }),
  catchApiAsyncError(async (req: NextRequest, { params }) => {
    const { id } = params as { id: string };

    // Check if ideas admin is authenticated
    // @ts-expect-error: parsed is not defined in Request type
    const isIdeasAdmin = !!req.parsed?.ideasAdmin;

    // Try to find by ID first, then by slug
    const idea = await prisma.idea.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
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

    if (!idea) {
      return sendNextResponse({
        status: 404,
        message: "Idea not found",
      });
    }

    // Only show published ideas to public, or all to admin
    // For admin pages, always allow access to drafts
    if (idea.status === "draft" && !isIdeasAdmin) {
      return sendNextResponse({
        status: 404,
        message: "Idea not found",
      });
    }

    return sendNextResponse({
      status: 200,
      data: idea,
      message: "Idea fetched successfully",
    });
  })
);

/**
 * PUT /api/ideas/[id]
 * Update an idea (ideas admin only)
 */
export const PUT = applyMiddleware(
  validateIdeasAdminAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req: NextRequest, { params }) => {
    const { id } = params as { id: string };
    const body = await req.json();
    const { title, summary, content, tags, thumbnail, status, publishedAt, authorId } = body;

    // Find the idea
    const existingIdea = await prisma.idea.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
    });

    if (!existingIdea) {
      return sendNextResponse({
        status: 404,
        message: "Idea not found",
      });
    }

    // Generate new slug from title if title changed (used in URL: /api/ideas/title-of-post)
    let slug = existingIdea.slug;
    if (title && title !== existingIdea.title) {
      slug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

      // Check if new slug already exists
      const slugExists = await prisma.idea.findFirst({
        where: {
          slug,
          id: { not: existingIdea.id },
        },
      });

      if (slugExists) {
        return sendNextResponse({
          status: 400,
          message: "An idea with this title already exists",
        });
      }
    }

    // Determine publishedAt based on status
    let finalPublishedAt = existingIdea.publishedAt;
    if (status === "published" && !existingIdea.publishedAt) {
      finalPublishedAt = publishedAt ? new Date(publishedAt) : new Date();
    } else if (status === "draft") {
      finalPublishedAt = null;
    } else if (publishedAt && status === "published") {
      finalPublishedAt = new Date(publishedAt);
    }

    const updatedIdea = await prisma.idea.update({
      where: { id: existingIdea.id },
      data: {
        ...(title && { title, slug }),
        ...(summary !== undefined && { summary }),
        ...(content !== undefined && { content }),
        ...(tags !== undefined && { tags }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(status !== undefined && { status: (status === "published" ? "published" : "draft") as "draft" | "published" }),
        ...(finalPublishedAt !== undefined && { publishedAt: finalPublishedAt }),
        ...(authorId !== undefined && { authorId }),
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
      status: 200,
      data: updatedIdea,
      message: "Idea updated successfully",
    });
  })
);

/**
 * DELETE /api/ideas/[id]
 * Delete an idea (ideas admin only)
 */
export const DELETE = applyMiddleware(
  validateIdeasAdminAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req: NextRequest, { params }) => {
    const { id } = params as { id: string };

    // Find the idea
    const existingIdea = await prisma.idea.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
    });

    if (!existingIdea) {
      return sendNextResponse({
        status: 404,
        message: "Idea not found",
      });
    }

    await prisma.idea.delete({
      where: { id: existingIdea.id },
    });

    return sendNextResponse({
      status: 200,
      message: "Idea deleted successfully",
    });
  })
);
