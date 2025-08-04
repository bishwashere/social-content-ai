'use server';

import { prisma } from "@/lib/prisma";

export async function editChatContent({
  chatId,
  platform,
  content,
}: {
  chatId: string;
  platform: string;
  content: string;
}) {
  try {
    const chat = await prisma.projectChat.findFirst({
      where: {
        id: chatId,
      },
    });

    if (!chat) return null;

    // Update the contents JSON
    const currentContents = (chat.contents as Record<string, string>) || {};
    currentContents[platform] = content;

    const updated = await prisma.projectChat.update({
      where: { id: chat.id },
      data: {
        contents: currentContents,
      },
    });

    return updated;
  } catch (error) {
    console.error('Error updating chat content:', error);
    return null;
  }
}