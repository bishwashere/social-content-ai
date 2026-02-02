import { INVITED_USER_ROLES } from "@/constants/common";
import { PLATFORM_IDS } from "@/constants/platforms";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import { AI } from "@/lib/ai";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { isSubscriptionExpired } from "@/lib/sub";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";
import { generateTextCardImageForQuickGenerate } from "@/backend-apis/text-image/actions";
import { cleanAIGeneratedText } from "@/lib/clean-ai-text";

/**
 * Helper to convert media S3 keys to signed URLs
 */
async function getSignedMediaUrls(media: Record<string, string>): Promise<Record<string, string>> {
  const signedMedia: Record<string, string> = {};
  for (const [platform, s3Key] of Object.entries(media)) {
    if (s3Key) {
      signedMedia[platform] = await s3.getSignedUrlForVideoDownload(s3Key);
    }
  }
  return signedMedia;
}

/**
 * Create a chat or update an existing chat
 * */
export const POST = applyMiddleware(
  requestValidator.validateBody(projectValidator.createChat),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error - user is not defined in Request type
    const user = req.parsed.user;

    // Check if the user has remaining chat generations (tokens)
    // If user has tokens, allow generation regardless of subscription status
    // This allows users with basic tokens (100 tokens) to use the service without subscription
    if (user.remainingChatGenerations <= 0) {
      // User has no tokens - check subscription status
      const subs = await prisma.subscription.findFirst({
        where: { userId: user.id },
      });

      if (!subs) {
        return sendNextResponse({
          status: 403,
          message: "You have exhausted your tokens. Please purchase more tokens or subscribe to continue.",
        });
      }

      if (isSubscriptionExpired(subs.endsAt.toISOString()).isExpired) {
        return sendNextResponse({
          status: 403,
          message: "You have exhausted your tokens and your subscription has expired. Please purchase tokens or renew your subscription.",
        });
      }

      // User has subscription but no tokens - they need to purchase coins
      return sendNextResponse({
        status: 403,
        message: "You have exhausted your tokens. Please purchase more tokens to continue.",
      });
    }

    // User has tokens - allow generation regardless of subscription status
    // This enables token-based usage for users without subscriptions

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

      // Clean up AI-generated content (bold, em/en dash, spacing, etc.)
      const cleanedContent: Record<string, string> = {};
      for (const [platform, content] of Object.entries(chatFromAI)) {
        if (typeof content === 'string') {
          cleanedContent[platform] = cleanAIGeneratedText(content);
        } else {
          cleanedContent[platform] = content;
        }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { remainingChatGenerations: user.remainingChatGenerations - 1 },
      });

      return sendNextResponse({
        status: 200,
        message: "Chat generated successfully",
        data: { contents: cleanedContent },
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

      // Clean up AI-generated content (bold, em/en dash, spacing, etc.)
      const cleanedContent: Record<string, string> = {};
      for (const [platform, content] of Object.entries(chatFromAI)) {
        if (typeof content === 'string') {
          cleanedContent[platform] = cleanAIGeneratedText(content);
        } else {
          cleanedContent[platform] = content;
        }
      }

      // Generate Instagram text card image if Instagram content exists
      let mediaData: Record<string, string> = {};
      if (cleanedContent[PLATFORM_IDS.INSTAGRAM]) {
        console.log("[Chat API] Generating Instagram text card image...");
        const textCardResult = await generateTextCardImageForQuickGenerate({
          content: cleanedContent[PLATFORM_IDS.INSTAGRAM],
          userId: user.id,
          projectId: projectId,
        });
        
        if (textCardResult.success && textCardResult.mediaKey) {
          mediaData[PLATFORM_IDS.INSTAGRAM] = textCardResult.mediaKey;
          console.log("[Chat API] Instagram text card image generated:", textCardResult.mediaKey);
        } else {
          console.warn("[Chat API] Failed to generate Instagram text card:", textCardResult.error);
        }
      }

      const chatName = await ai.generateChatName({
        content: JSON.stringify(cleanedContent),
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
            contents: cleanedContent,
            media: Object.keys(mediaData).length > 0 ? mediaData : undefined,
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

        // Return with signed URLs for media
        const signedMedia = Object.keys(mediaData).length > 0 
          ? await getSignedMediaUrls(mediaData) 
          : undefined;

        return sendNextResponse({
          status: 200,
          message: "Chat updated successfully",
          data: {
            ...chat,
            media: signedMedia,
          },
        });
      } else {
        const projectChat = await prisma.projectChat.create({
          data: {
            contents: cleanedContent,
            media: Object.keys(mediaData).length > 0 ? mediaData : undefined,
            title: chatName || "Untitled",
            prompt: body.userPrompt || "",
            projectId: projectId,
          },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { remainingChatGenerations: user.remainingChatGenerations - 1 },
        });

        // Return with signed URLs for media
        const signedMedia = Object.keys(mediaData).length > 0 
          ? await getSignedMediaUrls(mediaData) 
          : undefined;

        return sendNextResponse({
          status: 200,
          message: "Chat created successfully",
          data: {
            ...projectChat,
            media: signedMedia,
          },
        });
      }
    }
  })
);
