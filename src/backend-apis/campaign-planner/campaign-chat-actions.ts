"use server";

import { prisma } from "@/lib/prisma";
import { PLATFORM_IDS } from "@/constants/platforms";

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
}): Promise<{ projectId: string; campaignId: string } | null> => {
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

    // Get the projectId and campaignId to return for cache invalidation
    return { projectId: scheduledPost.projectId, campaignId };
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

    return { projectId: existingScheduledPost.projectId, campaignId };
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

  return { projectId: updated.planner?.projectId || "", campaignId };
};
