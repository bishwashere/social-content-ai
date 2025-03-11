import { INVITED_USER_ROLES } from "@/constants/common";
import { UserDoc } from "@/db/auth/schema/user";
import { ProjectChatDoc, ProjectChatModel } from "@/db/projects/schema/chat";
import {
  InvitedUserDoc,
  InvitedUserModel,
} from "@/db/projects/schema/invited-users";
import { ProjectDoc, ProjectModel } from "@/db/projects/schema/project";
import {
  SubscriptionDoc,
  SubscriptionModel,
} from "@/db/subscriptions/schema/subscription";
import { AI } from "@/lib/ai";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { isSubscriptionExpired } from "@/lib/sub";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";
import mongoose from "mongoose";
/**
 * Create a chat or update an existing chat
 * */
export const POST = applyMiddleware(
  connectToDBMiddleware(),
  requestValidator.validateBody(projectValidator.createChat),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, { params }) => {
    const { id: projectId } = params as { id: string };

    // @ts-expect-error - user is not defined in Request type
    const user = req.parsed.user as UserDoc;

    // check if the user has remaining chat generations
    if (user.remainingChatGenerations <= 0) {
      return sendNextResponse({
        status: 403,
        message: "You have exhausted your chat generations for this month",
      });
    }

    // check if subscription is expired
    const subs: SubscriptionDoc | null = await SubscriptionModel.findOne({
      userId: user._id,
    });

    if (!subs) {
      return sendNextResponse({
        status: 403,
        message: "You do not have an active subscription",
      });
    }

    if (isSubscriptionExpired(subs.endsAt.toISOString()).isExpired) {
      return sendNextResponse({
        status: 403,
        message: "Your subscription has expired",
      });
    }

    //@ts-expect-error - body is not defined in Request type
    const body = req.parsed.body as ProjectValidatorType["createChat"];

    const isInvited: InvitedUserDoc | null = await InvitedUserModel.findOne({
      userId: user._id,
      projectId: new mongoose.Types.ObjectId(projectId),
      role: INVITED_USER_ROLES.EDITOR,
    });

    const project: ProjectDoc | null = await ProjectModel.findById(projectId);

    if (!project) {
      return sendNextResponse({
        status: 404,
        message: "Project not found!",
      });
    }

    if (!project.userId.equals(user._id) && !isInvited) {
      return sendNextResponse({
        status: 403,
        message: "You cannot create chat for this project!",
      });
    }

    const ai = new AI();

    const chatFromAI = await ai.generateContent({
      projectDescription: project.description,
      userPrompt: body.userPrompt || "",
      projectName: project.name,
    });

    if (!chatFromAI) {
      return sendNextResponse({
        status: 400,
        message: "Failed to generate chat",
      });
    }

    const chatName = await ai.generateChatName({
      content: JSON.stringify(chatFromAI),
      prompt: body.userPrompt || "",
    });

    if (body.retry && body.retry.chatId) {
      const chat = await ProjectChatModel.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(body.retry.chatId as string),
          projectId: new mongoose.Types.ObjectId(projectId),
        },
        {
          $set: {
            updatedAt: new Date(),
            contents: chatFromAI,
            title: chatName || "Untitled",
            prompt: body.userPrompt || "",
            projectId: new mongoose.Types.ObjectId(projectId),
          },
        },
        {
          returnDocument: "after",
        }
      );

      if (!chat) {
        return sendNextResponse({
          status: 404,
          message: "Chat not found ",
        });
      }

      user.remainingChatGenerations -= 1;
      await user.save();

      return sendNextResponse({
        status: 200,
        message: "Chat updated successfully",
        data: chat,
      });
    } else {
      const projectChat: ProjectChatDoc = await ProjectChatModel.create({
        contents: chatFromAI,
        title: chatName || "Untitled",
        prompt: body.userPrompt || "",
        projectId: new mongoose.Types.ObjectId(projectId),
      });

      user.remainingChatGenerations -= 1;
      await user.save();

      return sendNextResponse({
        status: 200,
        message: "Chat created successfully",
        data: projectChat,
      });
    }
  })
);

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
  })
);
