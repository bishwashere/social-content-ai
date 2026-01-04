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
      platforms: platforms,
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
    // const timezoneToUse = timezone || "UTC";
    
    // Helper to convert local time in timezone to UTC
    // This function finds the UTC time that, when displayed in the target timezone, equals the desired local time
    // const convertLocalTimeToUTC = (year: number, month: number, day: number, hour: number, minute: number, tz: string): Date => {
    //   if (tz === "UTC") {
    //     return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
    //   }
      
    //   // Use a more reliable approach: create a date in the local timezone, then get its UTC equivalent
    //   // We'll create a date string in ISO format and use the timezone to convert
      
    //   // Create a date object representing the local time (as if it were in the target timezone)
    //   // Then find what UTC time that corresponds to
      
    //   // Strategy: Start with the local time as UTC, then adjust based on the actual timezone offset
    //   // We need to find: what UTC time, when displayed in timezone tz, shows as year/month/day hour:minute
      
    //   // Get the timezone offset at the target date/time
    //   // We'll use a test date to determine the offset
    //   const testDate = new Date(Date.UTC(year, month, day, 12, 0, 0)); // Use noon UTC as test
    //   const formatter = new Intl.DateTimeFormat('en-US', {
    //     timeZone: tz,
    //     timeZoneName: 'longOffset',
    //     year: 'numeric',
    //     month: '2-digit',
    //     day: '2-digit',
    //     hour: '2-digit',
    //     minute: '2-digit',
    //     hour12: false,
    //   });
      
    //   // Get the offset by comparing UTC time with local time
    //   // Create a date at the target local time and see what UTC time it represents
    //   // We'll iterate to find the correct UTC time
      
    //   // Start with a reasonable initial guess
    //   // Most timezones are within ±12 hours of UTC
    //   // For EST (UTC-5), if we want 18:00 EST, we need 23:00 UTC
    //   // So we start with hour + a reasonable offset
    //   let candidateUTC = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
      
    //   // Adjust based on timezone - we'll iterate to find the right UTC time
    //   for (let i = 0; i < 50; i++) {
    //     const formatter = new Intl.DateTimeFormat('en-US', {
    //       timeZone: tz,
    //       year: 'numeric',
    //       month: '2-digit',
    //       day: '2-digit',
    //       hour: '2-digit',
    //       minute: '2-digit',
    //       hour12: false,
    //     });
        
    //     const parts = formatter.formatToParts(candidateUTC);
    //     const tzYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    //     const tzMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    //     const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    //     const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    //     const tzMin = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        
    //     // Check if we found the correct local time
    //     if (tzYear === year && tzMonth === month && tzDay === day && 
    //         tzHour === hour && tzMin === minute) {
    //       return candidateUTC;
    //     }
        
    //     // Calculate the difference and adjust
    //     // If the displayed hour is less than desired, we need to add time to UTC
    //     // If the displayed hour is more than desired, we need to subtract time from UTC
    //     const hourDiff = hour - tzHour;
    //     const minDiff = minute - tzMin;
    //     const totalDiffMs = (hourDiff * 60 + minDiff) * 60 * 1000;
    //     candidateUTC = new Date(candidateUTC.getTime() - totalDiffMs);
        
    //     // Safety check to avoid infinite loops
    //     if (Math.abs(totalDiffMs) > 24 * 60 * 60 * 1000) {
    //       // If adjustment is too large, try a different starting point
    //       // For timezones west of UTC (like EST), we need to add hours
    //       // For timezones east of UTC, we subtract hours
    //       candidateUTC = new Date(Date.UTC(year, month, day, hour + 12, minute, 0, 0));
    //       break;
    //     }
    //   }
      
    //   return candidateUTC;
    // };

    // Parse time
    const [hours, minutes] = autoPostTime.split(":").map(Number);

    console.log("start date", campaign.startDate)
    // For each chat in the campaign
    for (const chat of campaign.chats) {
      // Calculate the date for this chat: startDate + (day - 1) days
      // Use proper date arithmetic to handle month/year boundaries correctly
      const startDate = new Date(campaign.startDate);
      startDate.setHours(startDate.getHours() + hours, startDate.getMinutes() + minutes);
      
      // Add (chat.day - 1) days to the start date
      const chatDate = new Date(startDate);
      chatDate.setDate(chatDate.getDate() + (chat.day - 1));
      
      // Extract date components from the calculated date
      // const year = chatDateLocal.getFullYear();
      // const month = chatDateLocal.getMonth();
      // const day = chatDateLocal.getDate();
      
      // Convert local time in user's timezone to UTC
      // const chatDate = convertLocalTimeToUTC(year, month, day, hours, minutes, timezoneToUse);

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
        try {
          console.log("chat date", chatDate)
          const scheduled = await schedulePost({
            projectId: projectId,
            platform: platformName,
            content: content,
            date: chatDate,
            meta: {
              campaignId: campaignId,
              campaignName: campaign.name || "",
              day: chat.day,
              source: "campaign",
              // timezone: timezoneToUse, // Store timezone for display
              // localTime: autoPostTime, // Store original local time (e.g., "18:00") for display
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
  // timezone,
  platforms,
}: {
  campaignId: string;
  projectId: string;
  autoPostTime: string; // Format: "HH:mm"
  // timezone?: string; // IANA timezone string (e.g., "America/New_York")
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
    // const timezoneToUse = timezone || metadata?.timezone || "UTC";

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

    // Helper to convert local time in timezone to UTC
    // This function finds the UTC time that, when displayed in the target timezone, equals the desired local time
    // const convertLocalTimeToUTC = (year: number, month: number, day: number, hour: number, minute: number, tz: string): Date => {
    //   if (tz === "UTC") {
    //     return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
    //   }
      
    //   // Use a more reliable approach: create a date in the local timezone, then get its UTC equivalent
    //   // We'll create a date string in ISO format and use the timezone to convert
      
    //   // Create a date object representing the local time (as if it were in the target timezone)
    //   // Then find what UTC time that corresponds to
      
    //   // Strategy: Start with the local time as UTC, then adjust based on the actual timezone offset
    //   // We need to find: what UTC time, when displayed in timezone tz, shows as year/month/day hour:minute
      
    //   // Get the timezone offset at the target date/time
    //   // We'll use a test date to determine the offset
    //   const testDate = new Date(Date.UTC(year, month, day, 12, 0, 0)); // Use noon UTC as test
    //   const formatter = new Intl.DateTimeFormat('en-US', {
    //     timeZone: tz,
    //     timeZoneName: 'longOffset',
    //     year: 'numeric',
    //     month: '2-digit',
    //     day: '2-digit',
    //     hour: '2-digit',
    //     minute: '2-digit',
    //     hour12: false,
    //   });
      
    //   // Get the offset by comparing UTC time with local time
    //   // Create a date at the target local time and see what UTC time it represents
    //   // We'll iterate to find the correct UTC time
      
    //   // Start with a reasonable initial guess
    //   // Most timezones are within ±12 hours of UTC
    //   // For EST (UTC-5), if we want 18:00 EST, we need 23:00 UTC
    //   // So we start with hour + a reasonable offset
    //   let candidateUTC = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
      
    //   // Adjust based on timezone - we'll iterate to find the right UTC time
    //   for (let i = 0; i < 50; i++) {
    //     const formatter = new Intl.DateTimeFormat('en-US', {
    //       timeZone: tz,
    //       year: 'numeric',
    //       month: '2-digit',
    //       day: '2-digit',
    //       hour: '2-digit',
    //       minute: '2-digit',
    //       hour12: false,
    //     });
        
    //     const parts = formatter.formatToParts(candidateUTC);
    //     const tzYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    //     const tzMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    //     const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    //     const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    //     const tzMin = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        
    //     // Check if we found the correct local time
    //     if (tzYear === year && tzMonth === month && tzDay === day && 
    //         tzHour === hour && tzMin === minute) {
    //       return candidateUTC;
    //     }
        
    //     // Calculate the difference and adjust
    //     // If the displayed hour is less than desired, we need to add time to UTC
    //     // If the displayed hour is more than desired, we need to subtract time from UTC
    //     const hourDiff = hour - tzHour;
    //     const minDiff = minute - tzMin;
    //     const totalDiffMs = (hourDiff * 60 + minDiff) * 60 * 1000;
    //     candidateUTC = new Date(candidateUTC.getTime() - totalDiffMs);
        
    //     // Safety check to avoid infinite loops
    //     if (Math.abs(totalDiffMs) > 24 * 60 * 60 * 1000) {
    //       // If adjustment is too large, try a different starting point
    //       // For timezones west of UTC (like EST), we need to add hours
    //       // For timezones east of UTC, we subtract hours
    //       candidateUTC = new Date(Date.UTC(year, month, day, hour + 12, minute, 0, 0));
    //       break;
    //     }
    //   }
      
    //   return candidateUTC;
    // };

    // Parse time
    const [hours, minutes] = autoPostTime.split(":").map(Number);

    // For each chat in the campaign
    for (const chat of campaign.chats) {
      // Calculate the date for this chat: startDate + (day - 1) days
      // Use proper date arithmetic to handle month/year boundaries correctly
      const startDate = new Date(campaign.startDate);
      startDate.setHours(startDate.getHours() + hours, startDate.getMinutes() + minutes); // Reset to midnight to avoid timezone issues
      
      // Add (chat.day - 1) days to the start date
      const chatDateLocal = new Date(startDate);
      chatDateLocal.setDate(chatDateLocal.getDate() + (chat.day - 1));
      
      // Extract date components from the calculated date
      // const year = chatDateLocal.getFullYear();
      // const month = chatDateLocal.getMonth();
      // const day = chatDateLocal.getDate();
      
      // Convert user's local time in their timezone to UTC for storage
      // Example: 16:00 EST -> 21:00 UTC (stored in DB)
      // When displayed, UTC is converted back to EST: 21:00 UTC -> 16:00 EST
      // const chatDate = convertLocalTimeToUTC(year, month, day, hours, minutes, timezoneToUse);

      // Don't skip past dates - allow scheduling even if in the past
      // This ensures all campaign days are visible and can be manually triggered if needed

      try {
        // Create metadata-only ScheduledPost record
        // Trim webhook URL to ensure consistency (should already be trimmed, but be safe)
        const webhookValue = metadata.webhook ? metadata.webhook.trim() : "";
        console.log(`[scheduleCampaignTasks] Saving webhook URL to ScheduledPost: ${webhookValue}`);
        
        await prisma.scheduledPost.create({
          data: {
            projectId,
            platform: "webhook", // Special identifier for Blog News
            content: "", // Empty - will be generated on-the-fly
            date: chatDateLocal,
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
              // timezone: timezoneToUse, // Store timezone for display
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