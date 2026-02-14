import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateVideoAdminAuth } from "@/middlewares/validate-video-admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * Get all campaigns across all users, sorted by latest activity (updatedAt) on top
 */
export const GET = applyMiddleware(
  validateVideoAdminAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async () => {
    const campaigns = await prisma.campaignPlanner.findMany({
      select: {
        id: true,
        name: true,
        goal: true,
        targetAudience: true,
        platforms: true,
        startDate: true,
        totalDays: true,
        autoPostEnabled: true,
        createdAt: true,
        updatedAt: true,
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
        _count: {
          select: {
            chats: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return sendNextResponse({
      status: 200,
      message: "Campaigns fetched successfully",
      data: {
        campaigns,
        totalCampaigns: campaigns.length,
      },
    });
  })
);
