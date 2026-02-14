import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateVideoAdminAuth } from "@/middlewares/validate-video-admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * Get all quick generates (ProjectChat) across all users, sorted by latest activity (updatedAt) on top
 */
export const GET = applyMiddleware(
  validateVideoAdminAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async () => {
    const quickGenerates = await prisma.projectChat.findMany({
      select: {
        id: true,
        title: true,
        prompt: true,
        contents: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return sendNextResponse({
      status: 200,
      message: "Quick generates fetched successfully",
      data: {
        quickGenerates,
        totalQuickGenerates: quickGenerates.length,
      },
    });
  })
);
