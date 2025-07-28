import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";

export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;

    // Get all projects where user is owner or invited
    const [ownedProjects, invitedProjects] = await Promise.all([
      prisma.projects.findMany({
        where: { userId: user.id },
        include: {
          projectTrackings: true,
          projectChats: true,
          invitedUsers: true,
        },
      }),
      prisma.invitedUser.findMany({
        where: { userId: user.id },
        include: {
          project: {
            include: {
              projectTrackings: true,
              projectChats: true,
              invitedUsers: true,
            },
          },
        },
      }),
    ]);

    // Combine and format projects
    const allProjects = [
      ...ownedProjects,
      ...invitedProjects.map((invite) => invite.project),
    ];

    return sendNextResponse({
      status: 200,
      message: "Projects retrieved successfully",
      data: allProjects,
    });
  })
);

export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;

    const { name, description } = await req.json();

    if (!name) {
      return sendNextResponse({
        status: 400,
        message: "Project name is required",
      });
    }

    // Create project
    const project = await prisma.projects.create({
      data: {
        name,
        description,
        userId: user.id,
      },
      include: {
        projectTrackings: true,
        projectChats: true,
        invitedUsers: true,
      },
    });

    return sendNextResponse({
      status: 201,
      message: "Project created successfully",
      data: project,
    });
  })
);
