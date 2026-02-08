"use server";

import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import { PLATFORM_IDS } from "@/constants/platforms";

export const getCampaignPlanner = async (projectId: string) => {
  const planners = await prisma.campaignPlanner.findMany({
    where: {
      projectId: projectId,
    },
    include: { chats: true },
  });

  if (planners)
    return {
      chatsGroupedByCampaign: planners
        .map((p) => ({
          id: p.id,
          name: p.name,
          chats: p.chats.sort((a, b) => a.day - b.day), // day 1, 2, 3
          goal: p.goal,
          targetAudience: p.targetAudience,
          date: p.updatedAt,
          startDate: p.startDate ? new Date(p.startDate) : null, // normalize
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          projectId: p.projectId.toString(),
          platforms: p.platforms,
          autoPostEnabled: p.autoPostEnabled,
          autoPostTime: p.autoPostTime,
          autoPostPlatforms: p.autoPostPlatforms || [],
          blogNewsMetadata: (p as any).blogNewsMetadata || null, // Blog News metadata at campaign level
        }))
        .sort((a, b) => {
          // Sort by updatedAt descending (latest first) for all campaigns
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        }),
    };

};

// Lightweight function to get only campaign metadata without chats for faster initial load
// Returns only current campaigns (hides old campaigns where last chat day is in the past)
export const getCampaignPlannerMetadata = async (projectId: string, limit?: number) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[getCampaignPlannerMetadata] [${requestId}] START - projectId: ${projectId}, limit: ${limit}`);
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all campaigns first
    console.log(`[getCampaignPlannerMetadata] [${requestId}] About to query database...`);
    const planners = await prisma.campaignPlanner.findMany({
      where: {
        projectId: projectId,
      },
      select: {
        id: true,
        name: true,
        goal: true,
        targetAudience: true,
        updatedAt: true,
        startDate: true,
        createdAt: true,
        projectId: true,
        platforms: true,
        autoPostEnabled: true,
        autoPostTime: true,
        autoPostPlatforms: true,
        blogNewsMetadata: true,
        totalDays: true, // Include totalDays from campaign table
      },
      orderBy: {
        updatedAt: 'desc', // Latest first
      },
    });
    
    const queryDuration = Date.now() - startTime;
    console.log(`[getCampaignPlannerMetadata] [${requestId}] Database query completed in ${queryDuration}ms, found ${planners.length} campaigns`);

    // Filter to only current campaigns (hide old campaigns)
    // Old campaign = campaign whose last day is older than today
    // Use totalDays directly from campaign table instead of querying chats
    const currentCampaigns = planners.filter((p) => {
      // If no start date, it's current (not scheduled yet)
      if (!p.startDate) return true;
      
      // If no totalDays, show it (not old - might be a new campaign)
      if (!p.totalDays || p.totalDays === 0) return true;
      
      const baseDate = new Date(p.startDate);
      
      // Calculate the last day of the campaign: startDate + (totalDays - 1) days
      const lastDayOfCampaign = new Date(baseDate);
      lastDayOfCampaign.setDate(lastDayOfCampaign.getDate() + (p.totalDays - 1));
      lastDayOfCampaign.setHours(0, 0, 0, 0);
      
      // Campaign is "current" if the last day is today or in the future
      // Campaign is "old" if the last day is in the past
      const isCurrent = lastDayOfCampaign >= today;
      
      if (!isCurrent) {
        console.log(`[getCampaignPlannerMetadata] [${requestId}] Hiding old campaign: ${p.name || p.id}, last day: ${lastDayOfCampaign.toISOString()}`);
      }
      
      return isCurrent;
    });

    // Apply limit to current campaigns only
    const limitedCampaigns = limit ? currentCampaigns.slice(0, limit) : currentCampaigns;

    // Count old campaigns to inform the UI
    const oldCampaignsCount = planners.length - currentCampaigns.length;
    
    // Map to result format
    const result = {
      chatsGroupedByCampaign: limitedCampaigns.map((p) => ({
        id: p.id,
        name: p.name,
        goal: p.goal,
        targetAudience: p.targetAudience,
        date: p.updatedAt,
        startDate: p.startDate ? new Date(p.startDate) : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        projectId: p.projectId.toString(),
        platforms: p.platforms,
        autoPostEnabled: p.autoPostEnabled,
        autoPostTime: p.autoPostTime,
        autoPostPlatforms: p.autoPostPlatforms || [],
        blogNewsMetadata: (p as any).blogNewsMetadata || null,
        chatCount: p.totalDays || 0, // Use totalDays from campaign table
        chats: [], // Empty - will be loaded on demand
      })),
      hasOldCampaigns: oldCampaignsCount > 0, // Inform UI if old campaigns exist
    };
    
    const totalDuration = Date.now() - startTime;
    console.log(`[getCampaignPlannerMetadata] [${requestId}] SUCCESS - Total duration: ${totalDuration}ms`);
    console.log(`[getCampaignPlannerMetadata] [${requestId}] Returning ${result.chatsGroupedByCampaign.length} current campaigns (filtered out ${oldCampaignsCount} old campaigns)`);
    console.log(`[getCampaignPlannerMetadata] [${requestId}] hasOldCampaigns: ${result.hasOldCampaigns}, oldCampaignsCount: ${oldCampaignsCount}, total planners: ${planners.length}, current campaigns: ${currentCampaigns.length}`);
    
    return result;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[getCampaignPlannerMetadata] [${requestId}] ERROR after ${totalDuration}ms for projectId ${projectId}:`, error);
    // Return empty result on error
    return {
      chatsGroupedByCampaign: [],
      hasOldCampaigns: false, // Include hasOldCampaigns in error case
    };
  }
};

// Function to load old campaigns (campaigns where all dates have passed)
export const getOldCampaigns = async (projectId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all campaigns for the project (using totalDays from campaign table - much faster)
  const allPlanners = await prisma.campaignPlanner.findMany({
    where: {
      projectId: projectId,
    },
    select: {
      id: true,
      name: true,
      goal: true,
      targetAudience: true,
      updatedAt: true,
      startDate: true,
      createdAt: true,
      projectId: true,
      platforms: true,
      autoPostEnabled: true,
      autoPostTime: true,
      autoPostPlatforms: true,
      blogNewsMetadata: true,
      totalDays: true, // Include totalDays from campaign table
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Filter to only old campaigns (where last day is in the past)
  // Use totalDays directly from campaign table instead of querying chats
  const oldCampaigns = allPlanners.filter((p) => {
    if (!p.startDate) return false; // No start date means not scheduled, not old
    
    // If no totalDays, it's not old (might be a new campaign)
    if (!p.totalDays || p.totalDays === 0) return false;
    
    const baseDate = new Date(p.startDate);
    
    // Calculate the last day of the campaign: startDate + (totalDays - 1) days
    const lastDayOfCampaign = new Date(baseDate);
    lastDayOfCampaign.setDate(lastDayOfCampaign.getDate() + (p.totalDays - 1));
    lastDayOfCampaign.setHours(0, 0, 0, 0);
    
    // Campaign is "old" if the last day is in the past
    return lastDayOfCampaign < today;
  });

  return {
    chatsGroupedByCampaign: oldCampaigns.map((p) => ({
      id: p.id,
      name: p.name,
      goal: p.goal,
      targetAudience: p.targetAudience,
      date: p.updatedAt,
      startDate: p.startDate ? new Date(p.startDate) : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      projectId: p.projectId.toString(),
      platforms: p.platforms,
      autoPostEnabled: p.autoPostEnabled,
      autoPostTime: p.autoPostTime,
      autoPostPlatforms: p.autoPostPlatforms || [],
      blogNewsMetadata: (p as any).blogNewsMetadata || null,
      chatCount: p.totalDays || 0, // Use totalDays from campaign table
      chats: [], // Empty array - will be loaded on demand
    })),
  };
};

// Function to get scheduled posts for a campaign, grouped by day and platform
export const getScheduledPostsForCampaign = async (campaignId: string) => {
  // MongoDB Prisma doesn't support path queries, so we fetch and filter
  const allScheduledPosts = await prisma.scheduledPost.findMany({
    where: {
      status: { not: "posted" }, // Only get pending/scheduled posts, not already posted
    },
    orderBy: { date: "asc" },
  });

  // Filter posts that belong to this campaign
  const campaignPosts = allScheduledPosts.filter((post) => {
    const meta = post.meta as { campaignId?: string; day?: number; source?: string } | null;
    return meta?.campaignId === campaignId && meta?.source === "campaign";
  });

  // Group by day and platform, and generate signed URLs for media
  const postsWithSignedMedia = await Promise.all(
    campaignPosts.map(async (post) => {
      let signedMedia: string | null = null;
      if (post.media) {
        try {
          signedMedia = await s3.getSignedUrlForVideoDownload(post.media);
        } catch (error) {
          console.error(`Failed to get signed URL for scheduled post media:`, error);
          signedMedia = post.media; // Fallback to original key
        }
      }
      return {
        ...post,
        media: signedMedia,
      };
    })
  );

  return postsWithSignedMedia;
};

// Function to load chats for a specific campaign on demand
// Merges scheduled post data when posts have been scheduled
export const getCampaignChats = async (campaignId: string) => {
  const campaign = await prisma.campaignPlanner.findUnique({
    where: { id: campaignId },
    include: { chats: true },
  });

  if (!campaign) {
    return null;
  }

  // Get scheduled posts for this campaign
  const scheduledPosts = await getScheduledPostsForCampaign(campaignId);

  // Create a map of scheduled posts by day and platform for quick lookup
  const scheduledPostsMap = new Map<string, typeof scheduledPosts[0]>();
  for (const post of scheduledPosts) {
    const meta = post.meta as { day?: number } | null;
    if (meta?.day) {
      // Convert platform name back (twitter -> x)
      const platformKey = post.platform === "twitter" ? PLATFORM_IDS.X : post.platform;
      const key = `${meta.day}-${platformKey}`;
      scheduledPostsMap.set(key, post);
    }
  }

  // Process chats and merge with scheduled post data
  const chatsWithScheduledData = await Promise.all(
    campaign.chats.map(async (chat) => {
      const chatContents = (chat.contents as Record<string, string>) || {};
      const chatMedia = (chat.media as Record<string, string>) || {};
      
      // Build new contents and media from scheduled posts (if available)
      const mergedContents: Record<string, string> = {};
      const mergedMedia: Record<string, string> = {}; // Signed URLs for display
      const mergedMediaKeys: Record<string, string> = {}; // Original S3 keys for scheduling
      const scheduledPlatforms: Record<string, { 
        scheduledPostId: string; 
        scheduledDate: Date;
        status: string;
      }> = {};

      // Get all platforms from both campaign chat and scheduled posts
      const allPlatforms = new Set([
        ...Object.keys(chatContents),
        ...scheduledPosts
          .filter(p => (p.meta as { day?: number } | null)?.day === chat.day)
          .map(p => p.platform === "twitter" ? PLATFORM_IDS.X : p.platform)
      ]);

      for (const platform of allPlatforms) {
        const key = `${chat.day}-${platform}`;
        const scheduledPost = scheduledPostsMap.get(key);

        if (scheduledPost) {
          // Use scheduled post data (this is the source of truth after scheduling)
          mergedContents[platform] = scheduledPost.content;
          if (scheduledPost.media) {
            mergedMediaKeys[platform] = scheduledPost.media; // Store original S3 key for scheduling
            // Generate signed URL for display
            try {
              mergedMedia[platform] = await s3.getSignedUrlForVideoDownload(scheduledPost.media);
            } catch (error) {
              console.error(`Failed to get signed URL for scheduled ${platform} media:`, error);
              mergedMedia[platform] = scheduledPost.media; // Fallback to raw key (will fail in UI)
            }
          }
          scheduledPlatforms[platform] = {
            scheduledPostId: scheduledPost.id,
            scheduledDate: scheduledPost.date,
            status: scheduledPost.status,
          };
        } else {
          // Use campaign chat data (not yet scheduled)
          if (chatContents[platform]) {
            mergedContents[platform] = chatContents[platform];
          }
          // Generate signed URL for campaign chat media, but keep original key
          if (chatMedia[platform]) {
            mergedMediaKeys[platform] = chatMedia[platform]; // Store original S3 key
            try {
              mergedMedia[platform] = await s3.getSignedUrlForVideoDownload(chatMedia[platform]);
            } catch (error) {
              console.error(`Failed to get signed URL for ${platform} media:`, error);
              mergedMedia[platform] = chatMedia[platform];
            }
          }
        }
      }

      return {
        ...chat,
        contents: mergedContents,
        media: mergedMedia,
        mediaKeys: mergedMediaKeys, // Original S3 keys for scheduling
        scheduledPlatforms, // Field to track which platforms are scheduled
      };
    })
  );

  return {
    id: campaign.id,
    chats: chatsWithScheduledData.sort((a, b) => a.day - b.day),
  };
};
