import { prisma } from "@/lib/prisma";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import catchApiAsyncError from "@/lib/catch-api-async-error";

/**
 * GET: Return suggested subreddits for the project (from ProjectsSubredditData).
 * Used in campaign planner to show Reddit suggestions per day.
 */
export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, params) => {
    const { id: projectId } = (params?.params || {}) as { id: string };
    // @ts-expect-error - user is not defined in Request type
    const user = req.parsed.user;

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: {
        userId: true,
        invitedUsers: { select: { userId: true } },
      },
    });

    if (!project) {
      return sendNextResponse({ status: 404, message: "Project not found" });
    }

    const isOwner = project.userId === user.id;
    const isInvited = project.invitedUsers.some((inv) => inv.userId === user.id);
    if (!isOwner && !isInvited) {
      return sendNextResponse({
        status: 403,
        message: "You do not have permission to view this project",
      });
    }

    const data = await prisma.projectsSubredditData.findFirst({
      where: { projectId },
      select: { subreddit: true },
    });

    const subreddits = data?.subreddit ?? [];

    return sendNextResponse({
      status: 200,
      message: "Subreddit suggestions retrieved",
      data: { subreddits },
    });
  })
);
