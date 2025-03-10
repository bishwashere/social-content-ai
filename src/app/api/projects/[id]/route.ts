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
 * Edit a project
 */
export const PATCH = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  requestValidator.validateBody(projectValidator.updateProject),
  catchApiAsyncError(async (req, { params }) => {
    const { id: projectId } = params;

    console.log("Editing project with id: ", projectId);

    //@ts-expect-error: ................
    const body = req.parsed.body as ProjectValidatorType["updateProject"];

    //@ts-expect-error: ................
    const user = req.parsed.user as User;

    const project: ProjectDoc | null = await ProjectModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(user._id),
      },
      {
        $set: {
          updatedAt: new Date(),
          ...body,
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (!project) {
      return sendNextResponse({
        status: 404,
        message: "Project not found!",
      });
    }

    return sendNextResponse({
      status: 201,
      data: project,
      message: `Project ${project.name} updated successfully!`,
    });
  })
);
