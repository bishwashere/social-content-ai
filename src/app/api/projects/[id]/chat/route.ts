import { db } from "@/db";
import { User } from "@/db/auth/schema/user";
import { AI } from "@/lib/ai";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateBody } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";

export const POST = applyMiddleware(
  connectToDBMiddleware(),
  validateBody(projectValidator.createChat),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    const projectId = req.nextUrl.pathname.split("/")[3];
    console.log("href", req.nextUrl.href);

    // @ts-expect-error - user is not defined in Request type
    const userId = req.parsed.user as User;

    //@ts-expect-error - body is not defined in Request type
    const body = req.parsed.body as ProjectValidatorType["createChat"];

    console.log("projectId", projectId);

    const project = await db.projects.getProject({
      projectId,
      userId: userId._id.toString(),
    });

    if (!project.ok) {
      return sendNextResponse({
        status: 404,
        message: project.error,
      });
    }
    const ai = new AI();

    const chat = await ai.generateContent({
      projectDescription: project.data.description,
      userPrompt: body.userPrompt || "",
      projectName: project.data.name,
    });

    if (!chat) {
      return sendNextResponse({
        status: 400,
        message: "Failed to generate chat",
      });
    }

    const chatName = await ai.generateChatName({
      content: JSON.stringify(chat),
      prompt: body.userPrompt || "",
    });

    const savedChat = await db.projects.createChat({
      contents: chat,
      projectId,
      title: chatName || "Untitled",
      retry: body.retry || undefined,
      prompt: body.userPrompt || "",
    });

    if (!savedChat.ok) {
      return sendNextResponse({
        status: 400,
        message: savedChat.error,
      });
    }

    return sendNextResponse({
      status: 200,
      message: "Chat created successfully",
      data: savedChat.data,
    });
  })
);

export const GET = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    const projectId = req.nextUrl.pathname.split("/")[3];
    const chats = await db.projects.getChats({
      projectId,
    });

    if (!chats.ok) {
      return sendNextResponse({
        status: 500,
        message: chats.error,
      });
    }

    return sendNextResponse({
      status: 200,
      data: chats.data,
      message: `Project chats fetched successfully!`,
    });
  })
);
