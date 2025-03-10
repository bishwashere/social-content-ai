import { User } from "@/db/auth/schema/user";
import { ProjectChatModel } from "@/db/projects/schema/chat";
import { ProjectDoc, ProjectModel } from "@/db/projects/schema/project";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { projectValidator, ProjectValidatorType } from "@/validators/projects";

/**
 * Create a new project
 */
export const POST = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  requestValidator.validateBody(projectValidator.createProject),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: ................
    const body = req.parsed.body as ProjectValidatorType["createProject"];

    //@ts-expect-error: ................
    const user = req.parsed.user as User;

    const project: ProjectDoc = await ProjectModel.create({
      name: body.name,
      description: body.description,
      userId: user._id,
    });

    if (!project) {
      return sendNextResponse({
        status: 500,
        message: `Failed to create project!`,
      });
    }

    return sendNextResponse({
      status: 201,
      data: project.toJSON(),
      message: `Project ${project.name} created successfully!`,
    });
  })
);

/**
 * Get all projects that belong to the user with chat titles.
 */
export const GET = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: ................
    const user = req.parsed.user as User;

    const projects: ProjectDoc[] = await ProjectModel.find({
      $or: [{ userId: user._id }, { "invitedUsers.userId": user._id }],
    }).sort({ createdAt: -1 });

    const projectsWithChats = await Promise.all(
      projects.map(async (project) => {
        const chats = await ProjectChatModel.find({
          projectId: project._id,
        }).sort({ createdAt: -1 });

        return {
          ...project.toJSON(),
          chats: chats.map((chat) => chat.toJSON()),
        };
      })
    );

    if (!projectsWithChats) {
      return sendNextResponse({
        status: 500,
        message: `Failed to fetch projects!`,
      });
    }

    return sendNextResponse({
      status: 201,
      data: projectsWithChats,
      message: `Project fetched successfully!`,
    });
  })
);
