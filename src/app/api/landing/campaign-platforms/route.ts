import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { NextRequest } from "next/server";
import { Params } from "@/types/api";

/**
 * Public API endpoint to get campaign platform breakdown
 * No authentication required
 */
export const GET = catchApiAsyncError(async (_req: NextRequest, _params?: Params) => {
  try {
    // Get all campaigns with their platforms
    const campaigns = await prisma.campaignPlanner.findMany({
      select: {
        platforms: true,
        autoPostPlatforms: true,
      },
    });

    // Count campaigns by platform
    const platformCounts: Record<string, number> = {};
    const allPlatforms = ["twitter", "linkedin", "instagram", "facebook", "threads", "reddit", "tiktok"];

    // Initialize all platforms with 0
    allPlatforms.forEach(platform => {
      platformCounts[platform] = 0;
    });

    // Count platforms from campaigns
    campaigns.forEach(campaign => {
      // Use autoPostPlatforms if available, otherwise use platforms
      const platformsToCount = campaign.autoPostPlatforms.length > 0 
        ? campaign.autoPostPlatforms 
        : campaign.platforms;
      
      platformsToCount.forEach(platform => {
        if (platformCounts.hasOwnProperty(platform)) {
          platformCounts[platform]++;
        }
      });
    });

    // Format platform names for display
    const platformDisplayNames: Record<string, string> = {
      twitter: "X (Twitter)",
      linkedin: "LinkedIn",
      instagram: "Instagram",
      facebook: "Facebook",
      threads: "Threads",
      reddit: "Reddit",
      tiktok: "TikTok",
    };

    // Convert to array format for easier display
    const platformBreakdown = allPlatforms
      .filter(platform => platformCounts[platform] > 0)
      .map(platform => ({
        platform,
        displayName: platformDisplayNames[platform] || platform,
        count: platformCounts[platform],
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    return sendNextResponse({
      status: 200,
      message: "Campaign platform breakdown retrieved successfully",
      data: {
        platformBreakdown,
        totalCampaigns: campaigns.length,
      },
    });
  } catch (error) {
    console.error("Error fetching campaign platform breakdown:", error);
    throw error;
  }
});
