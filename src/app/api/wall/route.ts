import { ProjectDoc, ProjectModel } from "@/db/projects/schema/project";
import { WallDoc, WallModel } from "@/db/wall/schema/wall";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { wallValidator, wallValidatorType } from "@/validators/wall";

/**
 * Create a new project
 */
export const POST = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  requestValidator.validateBody(wallValidator.post),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: ................
    const body = req.parsed.body as wallValidatorType["post"];

    //@ts-expect-error: ................
    const user = req.parsed.user as User;

    const project: ProjectDoc | null = await ProjectModel.findById(
      body.projectId,
    );

    if (!project) {
      return sendNextResponse({
        status: 404,
        message: "Project not found!",
      });
    }
    if (!project.userId.equals(user._id)) {
      return sendNextResponse({
        status: 403,
        message: "You are not authorized to create a post for this project!",
      });
    }

    const post: WallDoc = await WallModel.create({
      ...body,
      userId: user._id,
    });

    return sendNextResponse({
      status: 201,
      data: post.toJSON(),
      message: "Post created successfully!",
    });
  }),
);

/**
 * Get all posts by latest in pagination
 */
export const GET = applyMiddleware(
  connectToDBMiddleware(),
  catchApiAsyncError(async (req) => {
    const page = req.nextUrl.searchParams.get("page") || 1;
    const limit = req.nextUrl.searchParams.get("limit") || 10;
    const posts: WallDoc[] = await WallModel.find()
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .populate("userId", "avatarUrl name")
      .populate("projectId", "name");

    const totalPosts = await WallModel.countDocuments();
    const totalPages = Math.ceil(totalPosts / +limit);
    const hasMore = +page < totalPages;

    return sendNextResponse({
      status: 200,
      data: {
        posts: posts.map((post) => post.toJSON()),
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
  }),
);
