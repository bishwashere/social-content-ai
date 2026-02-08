'use server';

import { prisma } from "@/lib/prisma";

export async function editChatContent({
  chatId,
  platform,
  content,
  media,
}: {
  chatId: string;
  platform: string;
  content?: string;
  media?: string;
}) {
  try {
    const chat = await prisma.projectChat.findFirst({
      where: {
        id: chatId,
      },
    });

    if (!chat) return null;

    const updateData: Record<string, any> = {};

    // Update the contents JSON if content is provided
    if (content !== undefined) {
      const currentContents = (chat.contents as Record<string, string>) || {};
      currentContents[platform] = content;
      updateData.contents = currentContents;
    }

    // Update the media JSON if media is provided
    if (media !== undefined) {
      const currentMedia = (chat.media as Record<string, string>) || {};
      currentMedia[platform] = media;
      updateData.media = currentMedia;
    }

    const updated = await prisma.projectChat.update({
      where: { id: chat.id },
      data: updateData,
    });

    return updated;
  } catch (error) {
    console.error('Error updating chat content:', error);
    return null;
  }
}