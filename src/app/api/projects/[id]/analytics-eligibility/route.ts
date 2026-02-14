import { prisma } from "@/lib/prisma";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import catchApiAsyncError from "@/lib/catch-api-async-error";

/**
 * GET: Check if project analytics and campaign analytics should be shown.
 * Eligible when: at least 1 scheduled post OR at least 3 successfully posted (PlatformPost) posts.
 */
export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, params) => {
    const { id: projectId } = (params?.params || {}) as { id: string };
    //@ts-expect-error - user is not defined in Request type
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

    const [scheduledCount, linkedProviderIds] = await Promise.all([
      prisma.scheduledPost.count({ where: { projectId } }),
      prisma.projectToOAuthProvider
        .findMany({
          where: { projectId },
          select: { oauthProviderId: true },
        })
        .then((rows) => rows.map((r) => r.oauthProviderId)),
    ]);

    const successfulPostCount =
      linkedProviderIds.length === 0
        ? 0
        : await prisma.platformPost.count({
            where: { oauthProviderId: { in: linkedProviderIds } },
          });

    const eligible =
      scheduledCount >= 1 || successfulPostCount >= 3;

    return sendNextResponse({
      status: 200,
      message: "Analytics eligibility retrieved",
      data: {
        eligible,
        scheduledCount,
        successfulPostCount,
      },
    });
  })
);
