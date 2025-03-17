import { ProjectChatDoc, ProjectChatModel } from "@/db/projects/schema/chat";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateUserAuth } from "@/middlewares/validate-auth";
import mongoose from "mongoose";

/**
 * Get project chats by project id
 */
export const GET = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    const projectId = req.nextUrl.pathname.split("/")[3];
    const chats: ProjectChatDoc[] = await ProjectChatModel.find({
      projectId: new mongoose.Types.ObjectId(projectId),
    }).sort({ createdAt: -1 });

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
