import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { NextRequest } from "next/server";
import { Params } from "@/types/api";

/**
 * Public API endpoint to get landing page statistics
 * No authentication required
 */
export const GET = catchApiAsyncError(async (_req: NextRequest, _params?: Params) => {
  try {
    // Get all statistics in parallel for better performance
    const [
      totalProjects,
      totalCampaigns,
      totalProjectChats,
      totalCampaignChats,
      totalUsers,
      usersWithAvatars,
    ] = await Promise.all([
      prisma.projects.count(),
      prisma.campaignPlanner.count(),
      prisma.projectChat.count(),
      prisma.campaignChat.count(),
      prisma.user.count(),
      // Fetch 50 users with avatars for display
      prisma.user.findMany({
        where: {
          avatarUrl: {
            not: "",
          },
        },
        select: {
          avatarUrl: true,
          name: true,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    // Calculate total content created
    // This includes: all projects + all campaigns + all chats (project chats + campaign chats per platform)
    const totalContentCreated =
      totalProjects + totalCampaigns + totalProjectChats + totalCampaignChats;

    console.log("Landing stats calculated:", {
      totalProjects,
      totalCampaigns,
      totalProjectChats,
      totalCampaignChats,
      totalUsers,
      totalContentCreated,
      usersWithAvatarsCount: usersWithAvatars.length,
    });

    return sendNextResponse({
      status: 200,
      message: "Landing page statistics retrieved successfully",
      data: {
        totalContentCreated,
        totalCampaigns,
        totalUsers,
        userAvatars: usersWithAvatars,
      },
    });
  } catch (error) {
    console.error("Error fetching landing stats:", error);
    throw error;
  }
});
