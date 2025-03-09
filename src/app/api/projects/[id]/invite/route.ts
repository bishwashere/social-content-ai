import { User, UserModel } from "@/db/auth/schema/user";
import { ProjectModel } from "@/db/projects/schema/project";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateBody } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";
import mongoose from "mongoose";
export const POST = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  validateBody(projectValidator.inviteUser),
  catchApiAsyncError(async (req) => {
    const projectId = req.nextUrl.pathname.split("/")[3];

    //@ts-expect-error: ................
    const user = req.parsed.user as User;

    //@ts-expect-error: ................
    const body = req.parsed.body as ProjectValidatorType["inviteUser"];

    const userToInvite = await UserModel.findOne({
      email: body.email,
    });

    if (!userToInvite) {
      return sendNextResponse({
        status: 400,
        message: `User with email ${body.email} not found!`,
      });
    }

    const project = await ProjectModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(projectId),
        userId: user._id.toString(),
      },
      {
        $addToSet: {
          invitedUsers: {
            userId: userToInvite._id,
          },
        },
      },
      { new: true }
    );

    if (!project) {
      return sendNextResponse({
        status: 400,
        message: `Either project with id ${projectId} not found or you don't have permission to invite users to this project!`,
      });
    }

    return sendNextResponse({
      status: 201,
      data: project.data,
      message: "User invited successfully!",
    });
  })
);
