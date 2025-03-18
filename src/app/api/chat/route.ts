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
  catchApiAsyncError(async (req) => {
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

    if (!body.projectId && !body.projectName) {
      const ai = new AI();

      const chatFromAI = await ai.generateContent({
        userPrompt: body.userPrompt || "",
        options: body.options,
        projectDescription: body.projectDescription,
        projectName: body.projectName,
        retry: body.retry,
        projectId: body.projectId || "",
      });

      console.log("CHAT FROM AI: ", chatFromAI);

      if (!chatFromAI) {
        return sendNextResponse({
          status: 400,
          message: "Failed to generate chat",
        });
      }

      user.remainingChatGenerations -= 1;
      await user.save();

      return sendNextResponse({
        status: 200,
        message: "Chat generated successfully",
        data: { contents: chatFromAI },
      });
    } else {
      let projectId = body.projectId || "";

      if (!projectId) {
        // create a new project

        if (!body.projectName) {
          return sendNextResponse({
            status: 400,
            message: "Project name is required",
          });
        }

        const project: ProjectDoc = await ProjectModel.create({
          name: body.projectName,
          description: body.projectDescription || "",
          userId: user._id,
        });

        projectId = project._id.toString();
      }

      if (!projectId) {
        return sendNextResponse({
          status: 400,
          message: "Failed to create project",
        });
      }

      const isInvited: InvitedUserDoc | null = await InvitedUserModel.findOne({
        userId: user._id,
        projectId: new mongoose.Types.ObjectId(projectId),
        role: INVITED_USER_ROLES.EDITOR,
      });

      console.log("isInvited: ", isInvited);

      const project: ProjectDoc | null = await ProjectModel.findById(projectId);

      console.log("project: ", project);

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

      console.log("project: ", project);

      const ai = new AI();

      const chatFromAI = await ai.generateContent({
        projectDescription: project.description,
        projectName: project.name,
        userPrompt: body.userPrompt || "",
        options: body.options,
        retry: body.retry,
        projectId: projectId || "",
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
    }
  })
);
