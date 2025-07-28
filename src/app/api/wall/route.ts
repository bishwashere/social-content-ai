import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { wallValidator, wallValidatorType } from "@/validators/wall";

/**
 * Create a new project
 */
export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  requestValidator.validateBody(wallValidator.post),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: ................
    const body = req.parsed.body as wallValidatorType["post"];

    //@ts-expect-error: ................
    const user = req.parsed.user as User;

    const project = await prisma.projects.findUnique({
      where: {
        id: body.projectId,
      },
    });

    if (!project) {
      return sendNextResponse({
        status: 404,
        message: "Project not found!",
      });
    }
    if (project.userId !== user.id) {
      return sendNextResponse({
        status: 403,
        message: "You are not authorized to create a post for this project!",
      });
    }

    const post = await prisma.wall.create({
      data: {
        ...body,
        userId: user.id,
      },
    });

    return sendNextResponse({
      status: 201,
      data: post,
      message: "Post created successfully!",
    });
  })
);

/**
 * Get all posts by latest in pagination
 */
export const GET = applyMiddleware(
  catchApiAsyncError(async (req) => {
    const page = req.nextUrl.searchParams.get("page") || 1;
    const limit = req.nextUrl.searchParams.get("limit") || 10;
    const [posts, totalPosts] = await Promise.all([
      prisma.wall.findMany({
        orderBy: {
          createdAt: "desc",
        },
        skip: (+page - 1) * +limit,
        take: +limit,
        include: {
          user: {
            select: {
              avatarUrl: true,
              name: true,
            },
          },
          project: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.wall.count(),
    ]);

    const totalPages = Math.ceil(totalPosts / +limit);
    const hasMore = +page < totalPages;

    return sendNextResponse({
      status: 200,
      data: {
        posts,
        pagination: {
          page: +page,
          limit: +limit,
          totalPosts,
          totalPages,
          hasMore,
        },
      },
      message: "Posts fetched successfully!",
    });
  })
);

export const DELETE = applyMiddleware(
  catchApiAsyncError(async (req) => {
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return sendNextResponse({
        status: 401,
        message: "Unauthorized",
      });
    }

    // Get all projects where user is owner or invited
    const [ownedProjects, invitedProjects] = await Promise.all([
      prisma.projects.findMany({
        where: { userId },
        include: {
          walls: true,
        },
      }),
      prisma.invitedUser.findMany({
        where: { userId },
        include: {
          project: {
            include: {
              walls: true,
            },
          },
        },
      }),
    ]);

    // Combine and format projects with wall data
    const allProjects = [
      ...ownedProjects,
      ...invitedProjects.map((invite) => invite.project),
    ];

    // Get all wall posts from all projects
    const wallPosts = allProjects.flatMap((project) => project.walls || []);

    // Sort wall posts by date
    const sortedWallPosts = wallPosts.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return sendNextResponse({
      status: 200,
      message: "Wall posts retrieved successfully",
      data: sortedWallPosts,
    });
  })
);

export const PUT = applyMiddleware(
  catchApiAsyncError(async (req) => {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return sendNextResponse({
        status: 401,
        message: "Unauthorized",
      });
    }

    const { projectId, content, platform } = await req.json();

    if (!projectId || !content) {
      return sendNextResponse({
        status: 400,
        message: "Project ID and content are required",
      });
    }

    // Check if user has access to the project
    const project = await prisma.projects.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId },
          {
            invitedUsers: {
              some: {
                userId,
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return sendNextResponse({
        status: 404,
        message: "Project not found or access denied",
      });
    }

    // Create wall post
    const wallPost = await prisma.wall.create({
      data: {
        content,
        projectId,
        userId,
        platform,
      },
    });

    return sendNextResponse({
      status: 201,
      message: "Wall post created successfully",
      data: wallPost,
    });
  })
);
