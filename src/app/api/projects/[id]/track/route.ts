import { INVITED_USER_ROLES } from "@/constants/common";
import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";

/**
 * Track a project
 */
export const POST = applyMiddleware(
  requestValidator.validateBody(projectValidator.trackProject),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, params) => {
    const { id: projectId } = (params?.params || {}) as { id: string };

    //@ts-expect-error - body is not defined in Request type
    const body = req.parsed.body as ProjectValidatorType["trackProject"];

    //@ts-expect-error - user is not defined in Request type
    const user = req.parsed.user;

    const invitedProjects = await prisma.invitedUser.findMany({
      where: {
        userId: user.id,
        role: INVITED_USER_ROLES.EDITOR,
      },
      select: {
        projectId: true,
      },
    });

    console.log(invitedProjects, user);

    // either the user is the owner of the project or the user is invited to the project
    const project = await prisma.projects.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      return sendNextResponse({
        status: 404,
        message:
          "The project you are trying to track does not exist or has been deleted",
      });
    }

    if (
      project.userId !== user.id &&
      !invitedProjects.some((p) => p.projectId === project.id)
    ) {
      return sendNextResponse({
        status: 403,
        message: "You do not have permission for this action",
      });
    }

    const activity = await prisma.projectTracking.create({
      data: {
        projectId: projectId,
        ...body,
      },
    });

    return sendNextResponse({
      status: 200,
      message: "Project tracked successfully!",
      data: activity,
    });
  })
);

/**
 * Get project tracking data by project id
 */
export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (_req, params) => {
    const { id: projectId } = (params?.params || {}) as { id: string };

    const activity = await prisma.projectTracking.findMany({
      where: {
        projectId: projectId,
      },
    });

    if (!activity) {
      return sendNextResponse({
        status: 404,
        message: "Project tracking not found",
      });
    }

    return sendNextResponse({
      status: 200,
      data: activity,
      message: `Project tracking fetched successfully!`,
    });
  })
);
