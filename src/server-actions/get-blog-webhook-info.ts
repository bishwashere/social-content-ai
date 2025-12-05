"use server";

import { prisma } from "@/lib/prisma";

/**
 * Find campaign chat and webhook info for a blog by title
 * Returns campaignId, day, and blog data from campaign chat
 */
export async function getBlogWebhookInfo(blogTitle: string) {
  try {
    // Search all campaign chats for a blog with matching title
    const allChats = await prisma.campaignChat.findMany({
      where: {
        status: "GENERATED",
      },
      include: {
        planner: {
          select: {
            id: true,
            goal: true,
          },
        },
      },
    });

    // Find the chat that contains this blog
    for (const chat of allChats) {
      const contents = chat.contents as Record<string, any>;
      const blog = contents?.blog;

      if (blog?.title === blogTitle) {
        return {
          success: true,
          campaignId: chat.plannerId,
          day: chat.day,
          blog: {
            title: blog.title,
            content: blog.content,
            tags: blog.tags || [],
            sourceArticle: blog.sourceArticle,
          },
          goal: chat.planner?.goal,
        };
      }
    }

    return {
      success: false,
      message: "Campaign chat not found for this blog",
    };
  } catch (error) {
    console.error("Error finding blog webhook info:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to find blog webhook info",
    };
  }
}

