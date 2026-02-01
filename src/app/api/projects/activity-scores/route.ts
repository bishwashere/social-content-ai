import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";

const RECENT_DAYS = 30;

/**
 * GET /api/projects/activity-scores
 * Returns a rough activity score per project for the current user's projects
 * (recent posts, impressions, comments, likes). Used to sort analytics project menu.
 */
export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;

    const [owned, invited] = await Promise.all([
      prisma.projects.findMany({
        where: { userId: user.id },
        select: { id: true },
      }),
      prisma.invitedUser.findMany({
        where: { userId: user.id },
        select: { projectId: true },
      }),
    ]);
    const projectIds = [
      ...new Set([
        ...owned.map((p) => p.id),
        ...invited.map((i) => i.projectId),
      ]),
    ];

    if (projectIds.length === 0) {
      return sendNextResponse({
        status: 200,
        message: "Activity scores",
        data: [],
      });
    }

    const links = await prisma.projectToOAuthProvider.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, oauthProviderId: true },
    });
    const providerToProject = new Map<string, string>();
    links.forEach((l) => providerToProject.set(l.oauthProviderId, l.projectId));
    const providerIds = [...new Set(links.map((l) => l.oauthProviderId))];

    if (providerIds.length === 0) {
      const data = projectIds.map((projectId) => ({ projectId, score: 0 }));
      return sendNextResponse({
        status: 200,
        message: "Activity scores",
        data,
      });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RECENT_DAYS);

    const posts = await prisma.platformPost.findMany({
      where: {
        oauthProviderId: { in: providerIds },
        date: { gte: cutoff },
      },
      select: {
        oauthProviderId: true,
        impressions: true,
        comments: true,
        likes: true,
      },
    });

    const scores: Record<
      string,
      { posts: number; impressions: number; comments: number; likes: number }
    > = {};
    for (const post of posts) {
      const projectId = providerToProject.get(post.oauthProviderId);
      if (!projectId) continue;
      if (!scores[projectId])
        scores[projectId] = {
          posts: 0,
          impressions: 0,
          comments: 0,
          likes: 0,
        };
      scores[projectId].posts += 1;
      scores[projectId].impressions += post.impressions ?? 0;
      scores[projectId].comments += post.comments ?? 0;
      scores[projectId].likes += post.likes ?? 0;
    }

    // Rough score: posts matter most, then impressions, then engagement
    const result = Object.entries(scores).map(([projectId, agg]) => ({
      projectId,
      score:
        agg.posts * 50 +
        Math.min(agg.impressions * 0.001, 500) +
        agg.comments +
        agg.likes,
    }));

    // Include projects with no recent activity (score 0) so they appear at the end
    for (const id of projectIds) {
      if (!scores[id]) result.push({ projectId: id, score: 0 });
    }

    result.sort((a, b) => b.score - a.score);

    return sendNextResponse({
      status: 200,
      message: "Activity scores",
      data: result,
    });
  })
);
