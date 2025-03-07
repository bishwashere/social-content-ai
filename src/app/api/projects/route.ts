import { db } from "@/db";
import { User } from "@/db/auth/schema/user";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateBody } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";

export const POST = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  validateBody(projectValidator.createProject),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: ................
    const body = req.parsed.body as ProjectValidatorType["createProject"];

    //@ts-expect-error: ................
    const user = req.parsed.user as User;

    const project = await db.projects.create({
      name: body.name,
      description: body.description,
      userId: user._id,
    });

    if (!project.ok) {
      return sendNextResponse({
        status: 500,
        message: project.error,
      });
    }

    return sendNextResponse({
      status: 201,
      data: project.data,
      message: `Project ${project.data.name} created successfully!`,
    });
  })
);

export const GET = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: ................
    const user = req.parsed.user as User;

    const project = await db.projects.getAll({
      userId: user._id.toString(),
    });

    if (!project.ok) {
      return sendNextResponse({
        status: 500,
        message: project.error,
      });
    }

    return sendNextResponse({
      status: 201,
      data: project.data,
      message: `Project fetched successfully!`,
    });
  })
);
