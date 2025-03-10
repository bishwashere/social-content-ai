import { ProjectModel } from "@/db/projects/schema/project";
import {
  ProjectTrackingDoc,
  ProjectTrackingModel,
} from "@/db/projects/schema/tracking";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";
import mongoose from "mongoose";
/**
 * Track a project
 */
export const POST = applyMiddleware(
  connectToDBMiddleware(),
  requestValidator.validateBody(projectValidator.trackProject),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, { params }) => {
    const { id: projectId } = params as { id: string };

    //@ts-expect-error - body is not defined in Request type
    const body = req.parsed.body as ProjectValidatorType["trackProject"];

    console.log("projectId", projectId);

    const project = await ProjectModel.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
    });

    if (!project) {
      return sendNextResponse({
        status: 404,
        message: "Project not found",
      });
    }

    const activity = await ProjectTrackingModel.create({
      projectId: new mongoose.Types.ObjectId(projectId),
      ...body,
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
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (_req, { params }) => {
    const { id: projectId } = params as { id: string };

    const activity: ProjectTrackingDoc[] = await ProjectTrackingModel.find({
      projectId: new mongoose.Types.ObjectId(projectId),
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
