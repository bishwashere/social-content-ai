import { db } from "@/db";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateBody } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";

export const PATCH = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  validateBody(projectValidator.createProject.partial()),
  catchApiAsyncError(async (req) => {
    const projectId = req.nextUrl.href.split("/").pop() || "";

    console.log("Editing project with id: ", projectId);

    //@ts-expect-error: ................
    const body = req.parsed.body as Partial<
      ProjectValidatorType["createProject"]
    >;

    //@ts-expect-error: ................
    const user = req.parsed.user as User;

    const project = await db.projects.update({
      name: body.name,
      description: body.description,
      userId: user._id,
      _id: projectId,
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
