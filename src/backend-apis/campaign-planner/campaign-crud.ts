"use server";

import { CampaignPlanner } from "@/lib/campaign-planner";
import { prisma } from "@/lib/prisma";

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
  // Only check if user has at least 1 coin to create the campaign structure.
  // Starter campaigns (first campaign per project) are exempt: coins are charged at schedule time.
  const existingCampaignCount = await prisma.campaignPlanner.count({
    where: { projectId },
  });
  const isStarterCampaign = !id && existingCampaignCount === 0;

  if (!isStarterCampaign && user.remainingChatGenerations < 1) {
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
      isStarterCampaign,
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

export const changeCampaignData = async (
  id: string,
  name?: string,
  startDate?: Date,
  autoPostEnabled?: boolean,
  autoPostTime?: string,
  autoPostPlatforms?: string[],
  blogNewsMetadata?: { topics: string[]; angles: string[]; webhook: string; platforms?: string[]; timezone?: string },
  repeatNextMonth?: boolean
): Promise<string | false> => {
  try {
    const updateFields: Record<string, any> = {};

    if (name !== undefined) updateFields.name = name;
    if (startDate !== undefined) updateFields.startDate = startDate;
    if (autoPostEnabled !== undefined) updateFields.autoPostEnabled = autoPostEnabled;
    if (autoPostTime !== undefined) updateFields.autoPostTime = autoPostTime;
    if (autoPostPlatforms !== undefined) updateFields.autoPostPlatforms = autoPostPlatforms;
    if (repeatNextMonth !== undefined) updateFields.repeatNextMonth = repeatNextMonth;

    // Turning auto-post off: clear repeat flag and remove all pending scheduled posts
    if (autoPostEnabled === false) {
      updateFields.repeatNextMonth = false;

      const allScheduledPosts = await prisma.scheduledPost.findMany({
        where: { status: "pending" },
        select: { id: true, meta: true },
      });

      const postsToDelete = allScheduledPosts.filter((post) => {
        const metaCampaignId = (post.meta as any)?.campaignId;
        return (
          metaCampaignId === id ||
          (typeof metaCampaignId === "string" && metaCampaignId.includes(id))
        );
      });

      if (postsToDelete.length > 0) {
        await prisma.scheduledPost.deleteMany({
          where: { id: { in: postsToDelete.map((p) => p.id) } },
        });
        console.log(
          `[changeCampaignData] Deleted ${postsToDelete.length} pending scheduled posts for campaign ${id}`
        );
      }
    }
    
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
