"use server";

import { AI } from "@/lib/ai";
import { CampaignPlanner } from "@/lib/campaign-planner";
import { cleanAIGeneratedText } from "@/lib/clean-ai-text";
import { getRandomInRange } from "@/lib/getRandomInRange";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import { schedulePost } from "@/server-actions/schedule-post";
import { PLATFORM_IDS } from "@/constants/platforms";

export const startCampaignPlanner = async (
  id: string | undefined,
  projectId: string,
  campaignName: string,
  plan: CampaignPlanner,
  userId: string,
  platforms: string[],
  blogNewsMetadata?: { topics: string[]; angles: string[]; webhook: string; platforms?: string[]; targetAudience?: string; productRelated?: boolean }
) => {
  const chatData: {
    title: string;
    day: number;
    prompt: string;
    status: "PENDING" | "GENERATED";
    completed: boolean;
    // plannerId: string;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    contents: {};
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    tickMark: {};
  }[] = plan.data.map((d) => ({
    title: d.task,
    day: d.day,
    prompt: "",
    status: "PENDING",
    completed: false,
    // plannerId: "sdf",
    contents: {}, // JSON
    tickMark: {}, // JSON
  }));

  // Calculate totalDays from the maximum day number in plan.data
  const totalDays = plan.data.length > 0 
    ? Math.max(...plan.data.map((d) => d.day))
    : 0;

  // Fetch user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return {
      success: false,
      message: "User not found",
    };
  }

  // Allow creating empty campaigns without checking for all coins upfront
  // Coins will be deducted when generating individual chat content
  // Only check if user has at least 1 coin to create the campaign structure
  if (user.remainingChatGenerations < 1) {
    return {
      success: false,
      message: `You need at least 1 coin to create a campaign.`,
      insufficientCoins: true,
    };
  }

  if (id) {
    const updated = await prisma.campaignPlanner.update({
      where: { id },
      data: {
        chats: {
          updateMany: {
            where: {},
            data: {
              contents: {},
              status: "PENDING",
            },
          },
        },
        goal: plan.goal,
        targetAudience: plan.targetAudience,
        name: campaignName,
        platforms: platforms,
        totalDays: totalDays, // Update totalDays when updating campaign
      },
      include: {
        chats: true,
      },
    });

    // Update Blog News metadata if provided - store at campaign level
    if (plan.goal === "Blog News" && blogNewsMetadata) {
      await prisma.campaignPlanner.update({
        where: { id },
        data: {
          blogNewsMetadata: {
            topics: blogNewsMetadata.topics,
            angles: blogNewsMetadata.angles,
            webhook: blogNewsMetadata.webhook,
            platforms: blogNewsMetadata.platforms || [],
            targetAudience: blogNewsMetadata.targetAudience || plan.targetAudience,
            productRelated: blogNewsMetadata.productRelated ?? true,
          },
        },
      });
    }

    return {
      success: true,
      data: updated,
    };
  }

  const created = await prisma.campaignPlanner.create({
    data: {
      projectId,
      goal: plan.goal,
      targetAudience: plan.targetAudience,
      name: campaignName,
      // Default: campaign starts when it is created
      startDate: new Date(),
      platforms: platforms,
      totalDays: totalDays, // Save totalDays when creating campaign
      // Store Blog News metadata at campaign level
      ...(plan.goal === "Blog News" && blogNewsMetadata ? {
        blogNewsMetadata: {
          topics: blogNewsMetadata.topics,
          angles: blogNewsMetadata.angles,
          webhook: blogNewsMetadata.webhook ? blogNewsMetadata.webhook.trim() : "", // Trim whitespace only
          platforms: blogNewsMetadata.platforms || [],
          targetAudience: blogNewsMetadata.targetAudience || plan.targetAudience,
          productRelated: blogNewsMetadata.productRelated ?? true,
        },
      } : {}),
      chats: {
        create: chatData,
      },
    },
    include: {
      chats: true,
    },
  });

  return {
    success: true,
    data: created,
  };
};

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

export const generateCampaignChat = async (props: {
  projectId: string;
  id: string;
  prompt: string;
  userId: string;
  day: number;
  productRelated: boolean;
}) => {
  console.log("Props", props);

  // Fetch user
  const user = await prisma.user.findFirst({
    where: { id: props.userId },
  });

  if (!user) {
    return {
      success: false,
      message: "User not found",
    };
  }

  // Get campaign planner to check platforms
  const projectCampaign = await prisma.campaignPlanner.findFirst({
    where: {
      id: props.id,
      projectId: props.projectId,
    },
    include: {
      chats: true,
    },
  });

  if (!projectCampaign) {
    return {
      success: false,
      message: "Campaign not found",
    };
  }

  // Calculate required coins based on number of platforms (1 coin per platform for single generation)
  const requiredCoins = projectCampaign.platforms.length;

  if (user.remainingChatGenerations < requiredCoins) {
    return {
      success: false,
      message: `You need ${requiredCoins} coins to generate chat for ${projectCampaign.platforms.length} platforms.`,
      insufficientCoins: true,
    };
  }

  // Find project
  const project = await prisma.projects.findFirst({
    where: { id: props.projectId },
  });

  if (!project) {
    return {
      success: false,
      message: "Project not found",
    };
  }

  const ai = new AI();
  console.log("calling ai");
  console.log(projectCampaign);
  console.log(`Day`, props.day);
  const subredditData = await prisma.projectsSubredditData.findFirst({
    where: {
      projectId: props.projectId,
    },
  });

  const subredditIndex = getRandomInRange(
    0,
    subredditData?.subreddit.length ? subredditData?.subreddit.length - 1 : 0
  );

  const subreddit =
    subredditData?.subreddit[subredditIndex] ||
    subredditData?.subreddit[0] ||
    "";

  const popularPosts = await prisma.subredditPopularPosts.findFirst({
    where: {
      subreddit: subreddit,
    },
  });

  console.log("popularPosts", popularPosts);

  let redditPopularPost = "";

  if (popularPosts) {
    const randomPost = (popularPosts.posts as Array<{ body: string }>)[
      getRandomInRange(
        0,
        (popularPosts.posts as Array<{ body: string }>).length - 1
      )
    ];

    if (randomPost.body) {
      redditPopularPost = randomPost.body;
    }
  }
  console.log("redditPopularPost", redditPopularPost);

  const templateLength = await prisma.template.count();
  const randomIndex = Math.floor(Math.random() * templateLength);
  
  // Handle date conversion errors for templates
  let randomTemplate;
  try {
    randomTemplate = await prisma.template.findFirst({
      skip: randomIndex,
    });
  } catch (dateError: any) {
    // If error is due to date conversion, use raw query
    if (dateError?.code === 'P2023' || dateError?.message?.includes('Failed to convert')) {
      console.warn('[Campaign Planner] Template date conversion error, using raw query');
      const rawTemplates = await prisma.$runCommandRaw({
        find: "templates",
        filter: {},
      }) as any;
      
      const rawData = rawTemplates.cursor?.firstBatch || [];
      if (rawData.length > 0) {
        const template = rawData[randomIndex % rawData.length];
        // Helper to safely convert date from MongoDB
        const safeDate = (dateValue: any): Date => {
          if (!dateValue) return new Date();
          if (dateValue instanceof Date) {
            return isNaN(dateValue.getTime()) ? new Date() : dateValue;
          }
          if (typeof dateValue === 'string') {
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? new Date() : parsed;
          }
          // Handle MongoDB date format { $date: "..." }
          if (dateValue && typeof dateValue === 'object' && dateValue.$date) {
            const parsed = new Date(dateValue.$date);
            return isNaN(parsed.getTime()) ? new Date() : parsed;
          }
          return new Date();
        };

        randomTemplate = {
          id: template._id?.$oid || template._id?.toString() || template._id,
          title: template.title,
          description: template.description,
          category: template.category,
          content: template.content,
          icon: template.icon || null,
          source: template.source || null,
          sourcePostId: template.sourcePostId || null,
          createdAt: safeDate(template.createdAt),
          updatedAt: safeDate(template.updatedAt),
        };
      }
    } else {
      throw dateError;
    }
  }

  // Get selected platforms for this campaign (exclude tiktok - video only)
  const platforms = (projectCampaign.platforms || [
    PLATFORM_IDS.X,
    PLATFORM_IDS.FACEBOOK,
    PLATFORM_IDS.LINKEDIN,
    PLATFORM_IDS.INSTAGRAM,
    PLATFORM_IDS.THREADS,
    PLATFORM_IDS.REDDIT,
  ]).filter(p => p !== PLATFORM_IDS.TIKTOK);

  const chatFromAI = await ai.generateContent({
    userPrompt: props.prompt || "",
    projectDescription: project.description,
    projectName: project.name,
    projectId: props.projectId || "",
    projectRelated: props.productRelated,
    platforms: platforms,
    ...(redditPopularPost
      ? {
        extraInformation: {
          reddit: {
            popularPost: redditPopularPost,
          },
          template: randomTemplate?.content
        },
      }
      : {}),
      ...(randomTemplate
      ? {
        extraInformation: {
          template: randomTemplate?.content
        },
      }
      : {}),
  });

  if (!chatFromAI) {
    return {
      success: false,
      message: "Failed to generate content",
    };
  }

  // Clean up AI-generated content for all platforms
  const cleanedContent: Record<string, string> = {};
  for (const [platform, content] of Object.entries(chatFromAI)) {
    if (typeof content === 'string') {
      cleanedContent[platform] = cleanAIGeneratedText(content);
    } else {
      cleanedContent[platform] = content;
    }
  }

  // Find the specific chat for the given day
  const chatToUpdate = projectCampaign.chats.find(
    (chat) => chat.day === props.day
  );

  if (!chatToUpdate) {
    return {
      success: false,
      message: `No chat found for day ${props.day}`,
    };
  }

  // For Instagram, auto-generate text card image from content
  let mediaUpdate: Record<string, string> = {};
  if (platforms.includes(PLATFORM_IDS.INSTAGRAM) && cleanedContent[PLATFORM_IDS.INSTAGRAM]) {
    const { generateTextCardImage } = await import("@/backend-apis/text-image/actions");
    
    console.log("[Campaign Planner] Generating Instagram text card image...");
    const textCardResult = await generateTextCardImage({
      content: cleanedContent[PLATFORM_IDS.INSTAGRAM],
      userId: props.userId,
      campaignId: props.id,
      day: props.day,
    });
    
    if (textCardResult.success && textCardResult.mediaKey) {
      mediaUpdate[PLATFORM_IDS.INSTAGRAM] = textCardResult.mediaKey;
      console.log("[Campaign Planner] Instagram text card image generated:", textCardResult.mediaKey);
    } else {
      console.warn("[Campaign Planner] Failed to generate Instagram text card:", textCardResult.error);
    }
  }

  // Get existing media from the chat
  const existingMedia = (chatToUpdate.media as Record<string, string>) || {};
  const mergedMedia = { ...existingMedia, ...mediaUpdate };

  await prisma.campaignChat.update({
    where: {
      id: chatToUpdate.id,
    },
    data: {
      contents: cleanedContent,
      media: Object.keys(mergedMedia).length > 0 ? mergedMedia : undefined,
      status: "GENERATED",
      // subreddit: subreddit,
      referencePostContent: redditPopularPost?.slice(0, 50) || "",
    },
  });

  // Deduct coins based on number of platforms (1 coin per platform)
  const coinsToDeduct = projectCampaign.platforms.length;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      remainingChatGenerations: {
        decrement: coinsToDeduct,
      },
    },
  });

  return {
    success: true,
  };
};

export const changeCampaignData = async (
  id: string,
  name?: string,
  startDate?: Date,
  autoPostEnabled?: boolean,
  autoPostTime?: string,
  autoPostPlatforms?: string[],
  blogNewsMetadata?: { topics: string[]; angles: string[]; webhook: string; platforms?: string[]; timezone?: string }
): Promise<string | false> => {
  try {
    const updateFields: Record<string, any> = {};

    if (name !== undefined) updateFields.name = name;
    if (startDate !== undefined) updateFields.startDate = startDate;
    if (autoPostEnabled !== undefined) updateFields.autoPostEnabled = autoPostEnabled;
    if (autoPostTime !== undefined) updateFields.autoPostTime = autoPostTime;
    if (autoPostPlatforms !== undefined) updateFields.autoPostPlatforms = autoPostPlatforms;
    
    // Store Blog News metadata at campaign level
    if (blogNewsMetadata !== undefined) {
      // Preserve webhook URL exactly as provided (trim whitespace only)
      const webhookValue = blogNewsMetadata.webhook ? blogNewsMetadata.webhook.trim() : "";
      console.log("[changeCampaignData] Saving webhook URL:", webhookValue);
      
      updateFields.blogNewsMetadata = {
        topics: blogNewsMetadata.topics,
        angles: blogNewsMetadata.angles,
        webhook: webhookValue, // Save trimmed value
        platforms: blogNewsMetadata.platforms || [],
        ...(blogNewsMetadata.timezone && { timezone: blogNewsMetadata.timezone }),
      };
    }

    console.log({ id });
    console.log("[changeCampaignData] Update fields:", JSON.stringify(updateFields, null, 2));

    const planner = await prisma.campaignPlanner.update({
      where: { id },
      data: updateFields,
      include: {
        project: true, // optional, if you want to log project details
      },
    });

    console.log("Updated planner:", planner);

    return planner.projectId || false;
  } catch (error) {
    console.error("Error changing campaign data:", error);
    return false;
  }
};

export const deleteCampaign = async (id: string): Promise<boolean> => {
  try {
    // First, delete all scheduled posts associated with this campaign
    // MongoDB Prisma doesn't support path queries, so we fetch and filter
    const allScheduledPosts = await prisma.scheduledPost.findMany({
      select: {
        id: true,
        meta: true,
      },
    });

    // Filter posts that have this campaignId in their meta
    const postsToDelete = allScheduledPosts.filter((post) => {
      const meta = post.meta as any;
      const metaCampaignId = meta?.campaignId;
      
      // Exact match
      if (metaCampaignId === id) {
        return true;
      }
      
      // Partial match (in case campaignId is a substring of ObjectId)
      if (typeof metaCampaignId === 'string' && metaCampaignId.includes(id)) {
        return true;
      }
      
      // Also check if campaignId is at the end (common in MongoDB ObjectIds)
      if (typeof metaCampaignId === 'string' && metaCampaignId.endsWith(id)) {
        return true;
      }
      
      return false;
    });

    // Delete the scheduled posts by their IDs
    if (postsToDelete.length > 0) {
      const postIds = postsToDelete.map((post) => post.id);
      await prisma.scheduledPost.deleteMany({
        where: {
          id: {
            in: postIds,
          },
        },
      });
      console.log(`Deleted ${postsToDelete.length} scheduled posts for campaign ${id}`);
    }

    // Then delete the campaign itself
    await prisma.campaignPlanner.delete({
      where: { id },
    });

    return true;
  } catch (error) {
    console.error("Error deleting campaign data:", error);
    return false;
  }
};

export const toggleMarkAsComplete = async ({
  campaignId,
  day,
}: {
  campaignId: string;
  day: string;
}): Promise<string | null> => {
  const dayNumber = Number(day);

  // Find the chat record by campaign ID and day
  const chat = await prisma.campaignChat.findFirst({
    where: {
      plannerId: campaignId,
      day: dayNumber,
    },
  });

  if (!chat) return null;

  // Toggle the completed field
  const updated = await prisma.campaignChat.update({
    where: { id: chat.id },
    data: {
      completed: !chat.completed,
    },
    include: {
      planner: true,
    },
  });

  return updated.planner?.projectId || "";
};

export const toggleTickMark = async ({
  campaignId,
  day,
  platform,
  tick,
}: {
  campaignId: string;
  day: number;
  platform: string;
  tick: boolean;
}): Promise<string | null> => {
  const chat = await prisma.campaignChat.findFirst({
    where: {
      plannerId: campaignId,
      day: day,
    },
  });

  if (!chat) return null;

  // Update the tickMark JSON
  const currentTickMark = (chat.tickMark as Record<string, boolean>) || {};
  currentTickMark[platform] = tick;

  const updated = await prisma.campaignChat.update({
    where: { id: chat.id },
    data: {
      tickMark: currentTickMark,
    },
    include: {
      planner: true,
    },
  });

  return updated.planner?.projectId || "";
};

export const editChatContent = async ({
  campaignId,
  day,
  platform,
  content,
  media,
  scheduledPostId,
}: {
  campaignId: string;
  day: number;
  platform: string;
  content: string;
  media?: string;
  scheduledPostId?: string; // If provided, update the scheduled post directly
}): Promise<string | null> => {
  // Convert platform name for database (x -> twitter)
  const dbPlatform = platform === PLATFORM_IDS.X ? "twitter" : platform;

  // If scheduledPostId is provided, update the scheduled post directly
  if (scheduledPostId) {
    const scheduledPost = await prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId },
    });

    if (!scheduledPost) return null;

    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        content: content,
        ...(media !== undefined && { media: media }),
      },
    });

    // Get the projectId to return for cache invalidation
    return scheduledPost.projectId;
  }

  // Otherwise, check if there's a scheduled post for this campaign/day/platform
  const allScheduledPosts = await prisma.scheduledPost.findMany({
    where: {
      platform: dbPlatform,
      status: { not: "posted" },
    },
  });

  // Find the scheduled post for this campaign and day
  const existingScheduledPost = allScheduledPosts.find((post) => {
    const meta = post.meta as { campaignId?: string; day?: number; source?: string } | null;
    return meta?.campaignId === campaignId && meta?.day === day && meta?.source === "campaign";
  });

  if (existingScheduledPost) {
    // Update the scheduled post
    await prisma.scheduledPost.update({
      where: { id: existingScheduledPost.id },
      data: {
        content: content,
        ...(media !== undefined && { media: media }),
      },
    });

    return existingScheduledPost.projectId;
  }

  // No scheduled post found, update the campaign chat
  const chat = await prisma.campaignChat.findFirst({
    where: {
      plannerId: campaignId,
      day: day,
    },
  });

  if (!chat) return null;

  // Update the contents JSON
  const currentContents = (chat.contents as Record<string, string>) || {};
  currentContents[platform] = content;

  // Update the media JSON if provided
  const currentMedia = (chat.media as Record<string, string>) || {};
  if (media !== undefined) {
    currentMedia[platform] = media;
  }

  const updated = await prisma.campaignChat.update({
    where: { id: chat.id },
    data: {
      contents: currentContents,
      media: currentMedia,
    },
    include: {
      planner: true,
    },
  });

  return updated.planner?.projectId || "";
};

export const scheduleCampaignPosts = async ({
  campaignId,
  projectId,
  autoPostTime,
  timezone,
  platforms,
}: {
  campaignId: string;
  projectId: string;
  autoPostTime: string; // Format: "HH:mm"
  timezone?: string; // IANA timezone string (e.g., "America/New_York")
  platforms: string[];
}): Promise<{ success: boolean; scheduledCount: number; errors: string[] }> => {
  try {
    // Get campaign with chats
    const campaign = await prisma.campaignPlanner.findFirst({
      where: {
        id: campaignId,
        projectId: projectId,
      },
      include: {
        chats: true,
      },
    });

    if (!campaign) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["Campaign not found"],
      };
    }

    if (!campaign.startDate) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["Campaign must have a start date"],
      };
    }

    const errors: string[] = [];
    let scheduledCount = 0;

    // Use timezone from parameter or default to UTC
    const timezoneToUse = timezone || "UTC";
    
    // Helper to convert local time in user's selected timezone to UTC
    // The user explicitly selects their timezone in the UI, so we have precise information
    const convertLocalTimeToUTC = (year: number, month: number, day: number, hour: number, minute: number, tz: string): Date => {
      if (tz === "UTC") {
        return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
      }
      
      // Step 1: Create a reference UTC date with the desired local time values
      const referenceUTC = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
      
      // Step 2: Use the user's selected timezone to see what local time this UTC corresponds to
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      
      const parts = formatter.formatToParts(referenceUTC);
      const localTime = {
        year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
        month: parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1,
        day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
        hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
        minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0'),
      };
      
      // Step 3: Calculate the timezone offset (difference between desired and displayed time)
      const desiredMs = Date.UTC(year, month, day, hour, minute, 0, 0);
      const displayedMs = Date.UTC(localTime.year, localTime.month, localTime.day, localTime.hour, localTime.minute, 0, 0);
      const timezoneOffsetMs = desiredMs - displayedMs;
      
      // Step 4: Apply the offset to get the correct UTC time
      return new Date(referenceUTC.getTime() + timezoneOffsetMs);
    };

    // Parse the user's selected auto-post time (e.g., "18:00" -> 18, 0)
    const [hours, minutes] = autoPostTime.split(":").map(Number);

    // For each chat in the campaign
    for (const chat of campaign.chats) {
      // Calculate the date for this chat: startDate + (day - 1) days
      // Use UTC-based date arithmetic to avoid server timezone contamination
      const startDateObj = new Date(campaign.startDate);
      const startYear = startDateObj.getUTCFullYear();
      const startMonth = startDateObj.getUTCMonth();
      const startDay = startDateObj.getUTCDate();
      
      // Create the target date by adding days to the campaign start date
      const targetDate = new Date(Date.UTC(startYear, startMonth, startDay + (chat.day - 1), 0, 0, 0, 0));
      
      // Extract date components (using UTC to avoid server timezone issues)
      const year = targetDate.getUTCFullYear();
      const month = targetDate.getUTCMonth();
      const day = targetDate.getUTCDate();
      
      // Convert: user's selected time + timezone -> UTC for database storage
      const chatDate = convertLocalTimeToUTC(year, month, day, hours, minutes, timezoneToUse);

      // Guardrail: Skip posts scheduled in the past
      const now = new Date();
      if (chatDate.getTime() < now.getTime()) {
        errors.push(
          `Skipped post for day ${chat.day}: Scheduled date is in the past (${chatDate.toISOString()})`
        );
        continue; // Skip this chat day
      }

      // Get contents and media
      const contents = (chat.contents as Record<string, string>) || {};
      const mediaRecord = (chat.media as Record<string, string>) || {};

      // For each platform
      for (const platform of platforms) {
        const content = contents[platform];
        if (!content) {
          continue; // Skip if no content for this platform
        }

        // Convert platform name (x -> twitter)
        const platformName = platform === PLATFORM_IDS.X ? "twitter" : platform;
        
        // Get media for this platform (if any)
        const platformMedia = mediaRecord[platform];
        
        // Instagram requires media - skip scheduling if no media exists
        if (platform === PLATFORM_IDS.INSTAGRAM && !platformMedia) {
          errors.push(
            `Skipped Instagram post for day ${chat.day}: No media found. Please generate or upload an image first.`
          );
          continue;
        }

        // Schedule the post
        try {
          const scheduled = await schedulePost({
            projectId: projectId,
            platform: platformName,
            content: content,
            date: chatDate.toISOString(),
            media: platformMedia,
            meta: {
              campaignId: campaignId,
              campaignName: campaign.name || "",
              day: chat.day,
              source: "campaign",
              timezone: timezoneToUse, // Store timezone for display
              localTime: autoPostTime, // Store original local time (e.g., "18:00") for display
            },
          });

          if (scheduled) {
            scheduledCount++;
          } else {
            // Check if OAuth provider is mapped
            const hasProvider = await prisma.projectToOAuthProvider.findFirst({
              where: {
                projectId: projectId,
                oauthProvider: {
                  platform: platformName as any,
                },
              },
            });

            if (!hasProvider) {
              errors.push(
                `Failed to schedule post for day ${chat.day} on ${platform}: No OAuth provider mapped. Please connect your ${platform} account in project settings.`
              );
            } else {
              errors.push(
                `Failed to schedule post for day ${chat.day} on ${platform}`
              );
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors.push(
            `Failed to schedule post for day ${chat.day} on ${platform}: ${errorMessage}`
          );
        }
      }
    }

    return {
      success: errors.length === 0,
      scheduledCount,
      errors,
    };
  } catch (error) {
    console.error("Error scheduling campaign posts:", error);
    return {
      success: false,
      scheduledCount: 0,
      errors: [
        error instanceof Error ? error.message : "Unknown error occurred",
      ],
    };
  }
};

export const scheduleCampaignTasks = async ({
  campaignId,
  projectId,
  autoPostTime,
  timezone,
  platforms,
}: {
  campaignId: string;
  projectId: string;
  autoPostTime: string; // Format: "HH:mm"
  timezone?: string; // IANA timezone string (e.g., "America/New_York")
  platforms: string[]; // Platforms to post to after blog is generated
}): Promise<{ success: boolean; scheduledCount: number; errors: string[] }> => {
  try {
    // Get campaign with chats
    const campaign = await prisma.campaignPlanner.findFirst({
      where: {
        id: campaignId,
        projectId: projectId,
      },
      include: {
        chats: true,
      },
    });

    if (!campaign) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["Campaign not found"],
      };
    }

    if (!campaign.startDate) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["Campaign must have a start date"],
      };
    }

    if (campaign.goal !== "Blog News") {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["This function is only for Blog News campaigns"],
      };
    }

    // Get Blog News metadata
    const metadata = campaign.blogNewsMetadata as {
      topics: string[];
      angles: string[];
      webhook: string;
      platforms?: string[];
      timezone?: string;
    } | null;
    
    // Use timezone from parameter, metadata, or default to UTC
    const timezoneToUse = timezone || metadata?.timezone || "UTC";

    if (!metadata) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["Blog News metadata not found"],
      };
    }

    // Use platforms from parameter or metadata
    const platformsToUse = platforms.length > 0 ? platforms : (metadata.platforms || []);

    if (platformsToUse.length === 0) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["No platforms selected for Blog News campaign"],
      };
    }

    const errors: string[] = [];
    let scheduledCount = 0;

    // Helper to convert local time in user's selected timezone to UTC
    // The user explicitly selects their timezone in the UI, so we have precise information
    const convertLocalTimeToUTC = (year: number, month: number, day: number, hour: number, minute: number, tz: string): Date => {
      if (tz === "UTC") {
        return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
      }
      
      // Step 1: Create a reference UTC date with the desired local time values
      const referenceUTC = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
      
      // Step 2: Use the user's selected timezone to see what local time this UTC corresponds to
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      
      const parts = formatter.formatToParts(referenceUTC);
      const localTime = {
        year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
        month: parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1,
        day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
        hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
        minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0'),
      };
      
      // Step 3: Calculate the timezone offset (difference between desired and displayed time)
      const desiredMs = Date.UTC(year, month, day, hour, minute, 0, 0);
      const displayedMs = Date.UTC(localTime.year, localTime.month, localTime.day, localTime.hour, localTime.minute, 0, 0);
      const timezoneOffsetMs = desiredMs - displayedMs;
      
      // Step 4: Apply the offset to get the correct UTC time
      return new Date(referenceUTC.getTime() + timezoneOffsetMs);
    };

    // Parse the user's selected auto-post time (e.g., "18:00" -> 18, 0)
    const [hours, minutes] = autoPostTime.split(":").map(Number);

    // For each chat in the campaign
    for (const chat of campaign.chats) {
      // Calculate the date for this chat: startDate + (day - 1) days
      // Use UTC-based date arithmetic to avoid server timezone contamination
      const startDateObj = new Date(campaign.startDate);
      const startYear = startDateObj.getUTCFullYear();
      const startMonth = startDateObj.getUTCMonth();
      const startDay = startDateObj.getUTCDate();
      
      // Create the target date by adding days to the campaign start date
      const targetDate = new Date(Date.UTC(startYear, startMonth, startDay + (chat.day - 1), 0, 0, 0, 0));
      
      // Extract date components (using UTC to avoid server timezone issues)
      const year = targetDate.getUTCFullYear();
      const month = targetDate.getUTCMonth();
      const day = targetDate.getUTCDate();
      
      // Convert: user's selected time + timezone -> UTC for database storage
      // Example: 16:00 EST -> 21:00 UTC (stored in DB)
      // When displayed, UTC is converted back to EST: 21:00 UTC -> 16:00 EST
      const chatDate = convertLocalTimeToUTC(year, month, day, hours, minutes, timezoneToUse);

      // Guardrail: Skip posts scheduled in the past
      const now = new Date();
      if (chatDate.getTime() < now.getTime()) {
        errors.push(
          `Skipped task for day ${chat.day}: Scheduled date is in the past (${chatDate.toISOString()})`
        );
        continue; // Skip this chat day
      }

      try {
        // Create metadata-only ScheduledPost record
        // Trim webhook URL to ensure consistency (should already be trimmed, but be safe)
        const webhookValue = metadata.webhook ? metadata.webhook.trim() : "";
        console.log(`[scheduleCampaignTasks] Saving webhook URL to ScheduledPost: ${webhookValue}`);
        
        // Final database-level guardrail: Check right before saving to database
        // This is the last validation before the database write operation
        const finalDateCheck = new Date(chatDate);
        const nowCheck = new Date();
        if (finalDateCheck.getTime() < nowCheck.getTime()) {
          console.error(
            `❌ DATABASE GUARDRAIL: Blocked attempt to save scheduled post with past date. campaignId: ${campaignId}, day: ${chat.day}, date: ${chatDate.toISOString()}`
          );
          errors.push(
            `Skipped task for day ${chat.day}: Scheduled date is in the past (${chatDate.toISOString()})`
          );
          // Skip database write - do not create the scheduled post
          continue;
        }
        
        await prisma.scheduledPost.create({
          data: {
            projectId,
            platform: "webhook", // Special identifier for Blog News
            content: "", // Empty - will be generated on-the-fly
            date: chatDate.toISOString(),
            status: "pending",
            oauthProviderId: null, // Not needed for webhook
            meta: {
              type: "blog-news",
              campaignId,
              day: chat.day,
              topics: metadata.topics,
              angles: metadata.angles,
              webhook: webhookValue, // Use trimmed value
              platforms: platformsToUse, // Store platforms for later use
              timezone: timezoneToUse, // Store timezone for display
              localTime: autoPostTime, // Store original local time (e.g., "18:00") for display
            },
          },
        });

        scheduledCount++;
      } catch (error) {
        errors.push(
          `Failed to schedule day ${chat.day}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return {
      success: errors.length === 0,
      scheduledCount,
      errors,
    };
  } catch (error) {
    console.error("Error scheduling campaign tasks:", error);
    return {
      success: false,
      scheduledCount: 0,
      errors: [
        error instanceof Error ? error.message : "Unknown error occurred",
      ],
    };
  }
};