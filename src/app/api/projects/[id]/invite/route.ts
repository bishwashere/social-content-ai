import { INVITED_USER_ROLES } from "@/constants/common";
import { UserDoc, UserModel } from "@/db/auth/schema/user";
import {
  InvitedUserDoc,
  InvitedUserModel,
} from "@/db/projects/schema/invited-users";
import { ProjectDoc, ProjectModel } from "@/db/projects/schema/project";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";
import mongoose from "mongoose";

/**
 * Invite a user to the project
 */
export const POST = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  requestValidator.validateBody(projectValidator.inviteUser),
  catchApiAsyncError(async (req, { params }) => {
    const { id: projectId } = params;

    //@ts-expect-error: ................
    const user = req.parsed.user as UserDoc;

    //@ts-expect-error: ................
    const body = req.parsed.body as ProjectValidatorType["inviteUser"];

    const project: ProjectDoc | null = await ProjectModel.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
    });

    if (!project) {
      return sendNextResponse({
        status: 400,
        message: `Project with id ${projectId} not found!`,
      });
    }

    // check if the user has permission to invite users
    let hasPermission = false;

    if (project.userId.toString() === user._id.toString()) {
      hasPermission = true;
    }

    if (!hasPermission) {
      // check if the user has permission to invite users
      const invitedUser: InvitedUserDoc | null = await InvitedUserModel.findOne(
        {
          projectId: new mongoose.Types.ObjectId(projectId),
          userId: new mongoose.Types.ObjectId(user._id),
          role: INVITED_USER_ROLES.EDITOR,
        },
      );

      if (invitedUser) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return sendNextResponse({
        status: 403,
        message: "You do not have permission to invite users!",
      });
    }

    const userToInvite: UserDoc | null = await UserModel.findOne({
      email: body.email,
    });

    if (!userToInvite) {
      return sendNextResponse({
        status: 400,
        message: `User with email ${body.email} not found!`,
      });
    }

    // check if the user is already invited
    const invitedUser = await InvitedUserModel.findOneAndUpdate(
      {
        projectId: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userToInvite._id),
      },
      {
        role: body.role,
      },
      {
        new: true,
        upsert: true,
      },
    );

    return sendNextResponse({
      status: 201,
      data: invitedUser,
      message: "User invited successfully!",
    });
  }),
);
