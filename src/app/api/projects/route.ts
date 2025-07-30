import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import axios from "axios";

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
      data: allProjects?.sort(
        (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime()
      ),
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

    try {
      axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL}/api/projects/`,
        {
          projectId: project.id,
        }
      );
    } catch {}

    return sendNextResponse({
      status: 201,
      message: "Project created successfully",
      data: project,
    });
  })
);

// put route to generate subreddit data
export const PUT = async (req: Request) => {
  const { projectId } = await req.json();
  console.log("add subreddit data", projectId);
  if (!projectId) {
    return sendNextResponse({
      status: 400,
      message: "Project ID is required",
    });
  }

  const project = await prisma.projects.findFirst({
    where: { id: projectId },
  });

  if (!project) {
    return sendNextResponse({
      status: 404,
      message: "Project not found",
    });
  }
  try {
    // Generate subreddit data
    const subredditData = await axios.post(
      `${process.env.OLIVEDRIFT_BASE_URL}/api/getKeywordsAndSubreddits`,
      {
        text: project.name + " " + project.description,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OLIVEDRIFT_API_KEY}`,
        },
      }
    );

    if (subredditData.data.success) {
      await prisma.projectsSubredditData.create({
        data: {
          projectId: project.id,
          subreddit: (subredditData.data.subreddits as string[]).slice(0, 10),
        },
      });
    }
    console.log("subredditData.data", subredditData.data);
    return sendNextResponse({
      status: 200,
      message: "Subreddit data generated successfully",
    });
  } catch (error) {
    console.log("error", error);
    return sendNextResponse({
      status: 500,
      message: "Failed to generate subreddit data",
    });
  }
};
