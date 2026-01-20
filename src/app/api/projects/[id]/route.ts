import { INVITED_USER_ROLES } from "@/constants/common";
import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";

/**
 * Get project by id
 */
export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, params) => {
    const { id: projectId } = (params?.params || {}) as { id: string };

    //@ts-expect-error - user is not defined in Request type
    const user = req.parsed.user;

    const project = await prisma.projects.findUnique({
      where: {
        id: projectId,
      },
      include: {
        invitedUsers: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!project) {
      return sendNextResponse({
        status: 404,
        message: "Project not found",
      });
    }

    // check if user has access to project
    const isOwner = project.userId === user.id;
    const isInvited = project.invitedUsers.some(
      (invite) => invite.userId === user.id
    );

    if (!isOwner && !isInvited) {
      return sendNextResponse({
        status: 403,
        message: "You do not have permission to view this project",
      });
    }

    return sendNextResponse({
      status: 200,
      data: project,
      message: "Project fetched successfully!",
    });
  })
);

/**
 * Update project by id
 */
export const PATCH = applyMiddleware(
  requestValidator.validateBody(projectValidator.updateProject),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, params) => {
    const { id: projectId } = (params?.params || {}) as { id: string };

    //@ts-expect-error - body is not defined in Request type
    const body = req.parsed.body as ProjectValidatorType["updateProject"];

    //@ts-expect-error - user is not defined in Request type
    const user = req.parsed.user;

    // check if project exists and user has permission
    const project = await prisma.projects.findUnique({
      where: {
        id: projectId,
      },
      include: {
        invitedUsers: true,
      },
    });

    if (!project) {
      return sendNextResponse({
        status: 404,
        message: "Project not found",
      });
    }

    // check if user has permission to update project
    const isOwner = project.userId === user.id;
    const isEditor = project.invitedUsers.some(
      (invite) =>
        invite.userId === user.id && invite.role === INVITED_USER_ROLES.EDITOR
    );

    if (!isOwner && !isEditor) {
      return sendNextResponse({
        status: 403,
        message: "You do not have permission to update this project",
      });
    }

    // Store placeholders inside `platformUrls._placeholders` to avoid a schema migration.
    // NOTE: `placeholders` is accepted by the API but is not a Prisma field on Projects.
    const { placeholders, ...restBody } = body as any;

    const existingPlatformUrls = (project.platformUrls as any) || {};
    const incomingPlatformUrls = (restBody as any)?.platformUrls || {};

    const mergedPlatformUrls = {
      ...existingPlatformUrls,
      ...incomingPlatformUrls,
    };

    if (placeholders !== undefined && placeholders !== null) {
      // Normalize keys: allow user to pass "[Address]" or "Address"
      const normalized: Record<string, string> = {};
      for (const [rawKey, rawValue] of Object.entries(placeholders as Record<string, unknown>)) {
        if (typeof rawKey !== "string") continue;
        const key = rawKey.trim().replace(/^\[|\]$/g, "");
        if (!key) continue;
        normalized[key] = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
      }
      mergedPlatformUrls._placeholders = normalized;
    }

    const updatedProject = await prisma.projects.update({
      where: {
        id: projectId,
      },
      data: {
        ...restBody,
        // Only write platformUrls if we have either incoming platformUrls or placeholders
        ...((restBody as any)?.platformUrls !== undefined || placeholders !== undefined
          ? { platformUrls: mergedPlatformUrls }
          : {}),
      } as any,
    });

    return sendNextResponse({
      status: 200,
      data: updatedProject,
      message: "Project updated successfully!",
    });
  })
);

/**
 * Delete project by id
 */
export const DELETE = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, params) => {
    const { id: projectId } = (params?.params || {}) as { id: string };

    //@ts-expect-error - user is not defined in Request type
    const user = req.parsed.user;

    // check if project exists and user is owner
    const project = await prisma.projects.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      return sendNextResponse({
        status: 404,
        message: "Project not found",
      });
    }

    if (project.userId !== user.id) {
      return sendNextResponse({
        status: 403,
        message: "You do not have permission to delete this project",
      });
    }

    // Delete related data - ignore errors for missing data
    // Delete each relation independently to avoid transaction failures
    await Promise.allSettled([
      prisma.projectTracking.deleteMany({ where: { projectId } }),
      prisma.projectChat.deleteMany({ where: { projectId } }),
      prisma.invitedUser.deleteMany({ where: { projectId } }),
      prisma.campaignPlanner.deleteMany({ where: { projectId } }),
      prisma.wall.deleteMany({ where: { projectId } }),
      prisma.uploadedVideo.deleteMany({ where: { projectId } }),
      prisma.projectsSubredditData.deleteMany({ where: { projectId } }),
      prisma.projectPulse.deleteMany({ where: { projectId } }),
      prisma.projectToOAuthProvider.deleteMany({ where: { projectId } }),
      prisma.scheduledPost.deleteMany({ where: { projectId } }),
      prisma.projectFolderItem.deleteMany({ where: { projectId } }),
    ]);

    // Delete the project itself
    await prisma.projects.delete({ where: { id: projectId } });

    return sendNextResponse({
      status: 200,
      message: "Project deleted successfully!",
    });
  })
);