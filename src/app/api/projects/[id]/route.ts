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
  catchApiAsyncError(async (req, { params }) => {
    const { id: projectId } = params as { id: string };

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
  }),
);

/**
 * Update project by id
 */
export const PUT = applyMiddleware(
  requestValidator.validateBody(projectValidator.updateProject),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, { params }) => {
    const { id: projectId } = params as { id: string };

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

    const updatedProject = await prisma.projects.update({
      where: {
        id: projectId,
      },
      data: body,
    });

    return sendNextResponse({
      status: 200,
      data: updatedProject,
      message: "Project updated successfully!",
    });
  }),
);

/**
 * Delete project by id
 */
export const DELETE = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, { params }) => {
    const { id: projectId } = params as { id: string };

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

    // Delete all related data
    await Promise.all([
      prisma.invitedUser.deleteMany({
        where: {
          projectId: projectId,
        },
      }),
      prisma.projectChat.deleteMany({
        where: {
          projectId: projectId,
        },
      }),
      prisma.projectTracking.deleteMany({
        where: {
          projectId: projectId,
        },
      }),
    ]);

    // Delete the project
    await prisma.projects.delete({
      where: {
        id: projectId,
      },
    });

    return sendNextResponse({
      status: 200,
      message: "Project deleted successfully!",
    });
  }),
);
