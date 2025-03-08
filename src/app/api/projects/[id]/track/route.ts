import { db } from "@/db";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateBody } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";

export const POST = applyMiddleware(
  connectToDBMiddleware(),
  validateBody(projectValidator.trackProject),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    const projectId = req.nextUrl.pathname.split("/")[3];

    //@ts-expect-error - body is not defined in Request type
    const body = req.parsed.body as ProjectValidatorType["trackProject"];

    console.log("projectId", projectId);

    const project = await db.projects.trackProject({
      projectId,
      platform: body.platform,
      url: body.url || "",
      date: new Date(body.date),
    });

    if (!project.ok) {
      return sendNextResponse({
        status: 400,
        message: project.error,
      });
    }

    return sendNextResponse({
      status: 200,
      message: "Project tracked successfully!",
      data: project.data,
    });
  })
);

export const GET = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    const projectId = req.nextUrl.pathname.split("/")[3];

    const projectTracking = await db.projects.getProjectTracking({
      projectId,
    });

    if (!projectTracking.ok) {
      return sendNextResponse({
        status: 400,
        message: projectTracking.error,
      });
    }

    return sendNextResponse({
      status: 200,
      data: projectTracking.data,
      message: `Project tracking fetched successfully!`,
    });
  })
);
