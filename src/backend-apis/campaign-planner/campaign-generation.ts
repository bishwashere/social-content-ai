"use server";

import { AI } from "@/lib/ai";
import { cleanAIGeneratedText } from "@/lib/clean-ai-text";
import { getRandomInRange } from "@/lib/getRandomInRange";
import { prisma } from "@/lib/prisma";
import { PLATFORM_IDS } from "@/constants/platforms";

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
  const mediaUpdate: Record<string, string> = {};
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
