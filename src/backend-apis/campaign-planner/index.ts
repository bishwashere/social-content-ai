"use server";

import { AI } from "@/lib/ai";
import { CampaignPlanner } from "@/lib/campaign-planner";
import { getRandomInRange } from "@/lib/getRandomInRange";
import { prisma } from "@/lib/prisma";
import { schedulePost } from "@/server-actions/schedule-post";

export const startCampaignPlanner = async (
  id: string | undefined,
  projectId: string,
  campaignName: string,
  plan: CampaignPlanner,
  userId: string,
  platforms: string[],
  blogNewsMetadata?: { topics: string[]; angle: string; webhook: string; targetAudience?: string; productRelated?: boolean }
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
      },
      include: {
        chats: true,
      },
    });

    // Update Blog News metadata if provided
    if (plan.goal === "Blog News" && blogNewsMetadata && updated.chats.length > 0) {
      const firstChat = updated.chats[0];
      const existingContents = (firstChat.contents as Record<string, any>) || {};
      await prisma.campaignChat.update({
        where: { id: firstChat.id },
        data: {
          contents: {
            ...existingContents,
            _blogNewsMetadata: {
              topics: blogNewsMetadata.topics,
              angle: blogNewsMetadata.angle,
              webhook: blogNewsMetadata.webhook,
              targetAudience: blogNewsMetadata.targetAudience || plan.targetAudience,
              productRelated: blogNewsMetadata.productRelated ?? true,
            },
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
      platforms: platforms,
      chats: {
        create: chatData,
      },
    },
    include: {
      chats: true,
    },
  });

  // Store Blog News metadata in the first chat's contents if it's a Blog News campaign
  if (plan.goal === "Blog News" && blogNewsMetadata && created.chats.length > 0) {
    const firstChat = created.chats[0];
    await prisma.campaignChat.update({
      where: { id: firstChat.id },
      data: {
        contents: {
          _blogNewsMetadata: {
            topics: blogNewsMetadata.topics,
            angle: blogNewsMetadata.angle,
            webhook: blogNewsMetadata.webhook,
            targetAudience: blogNewsMetadata.targetAudience || plan.targetAudience,
            productRelated: blogNewsMetadata.productRelated ?? true,
          },
        },
      },
    });
  }

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
        }))
        .sort((a, b) => {
          // Sort by updatedAt descending (latest first) for all campaigns
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        }),
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
    "x",
    "facebook",
    "linkedin",
    "instagram",
    "threads",
    "reddit",
  ]).filter(p => p !== "tiktok");

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

  // Clean up content: remove ** (markdown bold markers) from all platform content
  const cleanedContent: Record<string, string> = {};
  for (const [platform, content] of Object.entries(chatFromAI)) {
    if (typeof content === 'string') {
      cleanedContent[platform] = content.replace(/\*\*/g, '');
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

  await prisma.campaignChat.update({
    where: {
      id: chatToUpdate.id,
    },
    data: {
      contents: cleanedContent,
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
  blogNewsMetadata?: { topics: string[]; angle: string; webhook: string }
): Promise<string | false> => {
  try {
    const updateFields: Record<string, any> = {};

    if (name !== undefined) updateFields.name = name;
    if (startDate !== undefined) updateFields.startDate = startDate;
    if (autoPostEnabled !== undefined) updateFields.autoPostEnabled = autoPostEnabled;
    if (autoPostTime !== undefined) updateFields.autoPostTime = autoPostTime;
    if (autoPostPlatforms !== undefined) updateFields.autoPostPlatforms = autoPostPlatforms;
    
    // Store Blog News metadata in a separate collection or in the campaign
    // For now, we'll store it in a way that can be retrieved later
    // TODO: Add proper schema fields for blogNewsMetadata
    if (blogNewsMetadata !== undefined) {
      // Store in a way that works - we can add proper fields later
      // For now, we'll need to retrieve it from somewhere else or add it to the schema
      console.log("Blog News metadata to store:", blogNewsMetadata);
    }

    console.log({ id });
    console.log(updateFields);

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
}: {
  campaignId: string;
  day: number;
  platform: string;
  content: string;
}): Promise<string | null> => {
  const chat = await prisma.campaignChat.findFirst({
    where: {
      plannerId: campaignId,
      day: day,
    },
  });

  if (!chat) return null;

  // Update the tickMark JSON
  const currentContents = (chat.contents as Record<string, string>) || {};
  currentContents[platform] = content;

  const updated = await prisma.campaignChat.update({
    where: { id: chat.id },
    data: {
      contents: currentContents,
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
  platforms,
}: {
  campaignId: string;
  projectId: string;
  autoPostTime: string; // Format: "HH:mm"
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

    // Parse time
    const [hours, minutes] = autoPostTime.split(":").map(Number);

    // For each chat in the campaign
    for (const chat of campaign.chats) {
      // Calculate the date for this chat: startDate + (day - 1) days
      const chatDate = new Date(campaign.startDate);
      chatDate.setDate(chatDate.getDate() + (chat.day - 1));
      chatDate.setHours(hours, minutes, 0, 0);

      // Skip if date is in the past
      if (chatDate < new Date()) {
        continue;
      }

      // Get contents
      const contents = (chat.contents as Record<string, string>) || {};

      // For each platform
      for (const platform of platforms) {
        const content = contents[platform];
        if (!content) {
          continue; // Skip if no content for this platform
        }

        // Convert platform name (x -> twitter)
        const platformName = platform === "x" ? "twitter" : platform;

        // Schedule the post
        const scheduled = await schedulePost({
          projectId: projectId,
          platform: platformName,
          content: content,
          date: chatDate.toISOString(),
          meta: {
            campaignId: campaignId,
            campaignName: campaign.name || "",
            day: chat.day,
            source: "campaign",
          },
        });

        if (scheduled) {
          scheduledCount++;
        } else {
          errors.push(
            `Failed to schedule post for day ${chat.day} on ${platform}`
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
}: {
  campaignId: string;
  projectId: string;
  autoPostTime: string; // Format: "HH:mm"
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

    const errors: string[] = [];
    let scheduledCount = 0;

    // Parse time
    const [hours, minutes] = autoPostTime.split(":").map(Number);

    // For each chat in the campaign
    for (const chat of campaign.chats) {
      // Calculate the date for this chat: startDate + (day - 1) days
      const chatDate = new Date(campaign.startDate);
      chatDate.setDate(chatDate.getDate() + (chat.day - 1));
      chatDate.setHours(hours, minutes, 0, 0);

      // Skip if date is in the past
      if (chatDate < new Date()) {
        continue;
      }

      // TODO: Schedule task execution here
      // For now, we'll create a placeholder structure
      // The actual task execution logic will be implemented later
      // This could involve:
      // 1. Creating a scheduled task record in the database
      // 2. Setting up a cron job or queue system
      // 3. Calling webhook endpoints
      // 4. Executing specific actions based on campaign configuration

      // Placeholder: Log the scheduled task
      console.log(`Scheduled task for Blog News campaign:`, {
        campaignId,
        day: chat.day,
        scheduledTime: chatDate.toISOString(),
        // Additional metadata can be stored here
        topics: [], // Will be populated from campaign metadata
        angle: "", // Will be populated from campaign metadata
        webhook: "", // Will be populated from campaign metadata
      });

      scheduledCount++;
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