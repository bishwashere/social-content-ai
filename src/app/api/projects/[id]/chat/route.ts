import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { validateUserAuth } from "@/middlewares/validate-auth";

/**
 * Get project chats by project id
 */
export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    const projectId = req.nextUrl.pathname.split("/")[3];
    const chats = await prisma.projectChat.findMany({
      where: {
        projectId: projectId,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!chats) {
      return sendNextResponse({
        status: 404,
        message: "Failed to get chats",
      });
    }

    return sendNextResponse({
      status: 200,
      data: chats,
      message: `Project chats fetched successfully!`,
    });
  }),
);
