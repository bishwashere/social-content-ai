import { INVITED_USER_ROLES } from "@/constants/common";
import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";

/**
 * Invite a user to a project
 */
export const POST = applyMiddleware(
  requestValidator.validateBody(projectValidator.inviteUser),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, { params }) => {
    const { id: projectId } = params as { id: string };

    //@ts-expect-error - body is not defined in Request type
    const body = req.parsed.body as ProjectValidatorType["inviteUser"];

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
        message:
          "The project you are trying to invite to does not exist or has been deleted",
      });
    }

    if (project.userId !== user.id) {
      return sendNextResponse({
        status: 403,
        message: "You do not have permission for this action",
      });
    }

    // check if user exists
    const invitedUser = await prisma.user.findFirst({
      where: {
        email: body.email,
      },
    });

    if (!invitedUser) {
      return sendNextResponse({
        status: 404,
        message: "User not found",
      });
    }

    // check if user is already invited
    const existingInvite = await prisma.invitedUser.findFirst({
      where: {
        projectId: projectId,
        userId: invitedUser.id,
      },
    });

    if (existingInvite) {
      return sendNextResponse({
        status: 400,
        message: "User is already invited to this project",
      });
    }

    // create invite
    const invite = await prisma.invitedUser.create({
      data: {
        projectId: projectId,
        userId: invitedUser.id,
        role: INVITED_USER_ROLES.EDITOR,
      },
    });

    return sendNextResponse({
      status: 200,
      message: "User invited successfully!",
      data: invite,
    });
  })
);

/**
 * Get invited users by project id
 */
export const DELETE = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (_req, { params }) => {
    const { id: projectId } = params as { id: string };

    const invitedUsers = await prisma.invitedUser.findMany({
      where: {
        projectId: projectId,
      },
      include: {
        user: true,
      },
    });

    if (!invitedUsers) {
      return sendNextResponse({
        status: 404,
        message: "No invited users found",
      });
    }

    return sendNextResponse({
      status: 200,
      data: invitedUsers,
      message: `Invited users fetched successfully!`,
    });
  })
);
