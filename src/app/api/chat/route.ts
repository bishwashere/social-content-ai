import { INVITED_USER_ROLES } from "@/constants/common";
import { prisma } from "@/lib/prisma";
import { AI } from "@/lib/ai";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { isSubscriptionExpired } from "@/lib/sub";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";

/**
 * Create a chat or update an existing chat
 * */
export const POST = applyMiddleware(
  requestValidator.validateBody(projectValidator.createChat),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error - user is not defined in Request type
    const user = req.parsed.user;

    // check if the user has remaining chat generations
    if (user.remainingChatGenerations <= 0) {
      return sendNextResponse({
        status: 403,
        message: "You have exhausted your chat generations for this month",
      });
    }

    // check if subscription is expired
    const subs = await prisma.subscription.findFirst({
      where: { userId: user.id },
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

    console.log("body: ", body);

    if (!body.projectId && !body.projectName) {
      const ai = new AI();

      const chatFromAI = await ai.generateContent({
        userPrompt: body.userPrompt || "",
        options: body.options,
        projectDescription: body.projectDescription,
        projectName: body.projectName,
        retry: body.retry,
        projectId: body.projectId || "",
        projectRelated: body.projectRelated,
      });

      if (!chatFromAI) {
        return sendNextResponse({
          status: 400,
          message: "Failed to generate chat",
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { remainingChatGenerations: user.remainingChatGenerations - 1 },
      });

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

        const project = await prisma.projects.create({
          data: {
            name: body.projectName,
            description: body.projectDescription || "",
            userId: user.id,
          },
        });

        projectId = project.id;
      }

      if (!projectId) {
        return sendNextResponse({
          status: 400,
          message: "Failed to create project",
        });
      }

      const isInvited = await prisma.invitedUser.findFirst({
        where: {
          userId: user.id,
          projectId: projectId,
          role: INVITED_USER_ROLES.EDITOR,
        },
      });

      console.log("isInvited: ", isInvited);

      const project = await prisma.projects.findUnique({
        where: { id: projectId },
      });

      console.log("project: ", project);

      if (!project) {
        return sendNextResponse({
          status: 404,
          message: "Project not found!",
        });
      }

      if (project.userId !== user.id && !isInvited) {
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
        projectRelated: body.projectRelated,
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
        const chat = await prisma.projectChat.update({
          where: {
            id: body.retry.chatId as string,
            projectId: projectId,
          },
          data: {
            updatedAt: new Date(),
            contents: chatFromAI,
            title: chatName || "Untitled",
            prompt: body.userPrompt || "",
          },
        });

        if (!chat) {
          return sendNextResponse({
            status: 404,
            message: "Chat not found ",
          });
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { remainingChatGenerations: user.remainingChatGenerations - 1 },
        });

        return sendNextResponse({
          status: 200,
          message: "Chat updated successfully",
          data: chat,
        });
      } else {
        const projectChat = await prisma.projectChat.create({
          data: {
            contents: chatFromAI,
            title: chatName || "Untitled",
            prompt: body.userPrompt || "",
            projectId: projectId,
          },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { remainingChatGenerations: user.remainingChatGenerations - 1 },
        });

        return sendNextResponse({
          status: 200,
          message: "Chat created successfully",
          data: projectChat,
        });
      }
    }
  })
);
