import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { validateUserAuth } from "@/middlewares/validate-auth";

/**
 * Get project chats by project id
 */
export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    const projectId = req.nextUrl.pathname.split("/")[3];
    const chats = await prisma.projectChat.findMany({
      where: {
        projectId: projectId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!chats) {
      return sendNextResponse({
        status: 404,
        message: "Failed to get chats",
      });
    }

    // Generate signed URLs for media in each chat
    const chatsWithSignedUrls = await Promise.all(
      chats.map(async (chat) => {
        if (!chat.media) return chat;
        
        const mediaObj = chat.media as Record<string, string>;
        const signedMedia: Record<string, string> = {};
        
        for (const [platform, s3Key] of Object.entries(mediaObj)) {
          if (s3Key) {
            signedMedia[platform] = await s3.getSignedUrlForVideoDownload(s3Key);
          }
        }
        
        return {
          ...chat,
          media: signedMedia,
        };
      })
    );

    return sendNextResponse({
      status: 200,
      data: chatsWithSignedUrls,
      message: `Project chats fetched successfully!`,
    });
  })
);
