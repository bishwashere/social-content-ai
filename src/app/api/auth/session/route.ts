import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { mail } from "@/lib/mail";
import { logEmail } from "@/lib/log-email";
import { buildTrackedUrl } from "@/lib/email-tracking";
import { PLATFORMS } from "@/lib/prompt";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { validateUserAuth } from "@/middlewares/validate-auth";

/**
 * Retrieve the user session
 */
export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: user is not defined
    const user = req.parsed.user;

    const now = new Date().getTime();
    const lastInformed = user.lastInformedAboutInactiveProject?.getTime() || 0;

    if (!lastInformed || now - lastInformed > 3 * 24 * 60 * 60 * 1000) {
      const [allProjects, connectedPlatforms, contentCount] = await Promise.all(
        [
          prisma.projects.findMany({ where: { userId: user.id } }),
          prisma.oauthProvider.findMany({
            where: { userId: user.id },
            select: { platform: true },
            distinct: ["platform"],
          }),
          prisma.campaignChat.count({
            where: {
              planner: {
                project: { userId: user.id },
              },
            },
          }),
        ]
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { lastInformedAboutInactiveProject: new Date() },
      });

      const trackings = await prisma.projectTracking.findMany({
        where: {
          projectId: { in: allProjects.map((p) => p.id) },
          date: { gte: new Date(now - 3 * 24 * 60 * 60 * 1000) },
        },
      });

      const trackingGroupByProject = trackings.reduce((acc, t) => {
        acc[t.projectId] = acc[t.projectId] || [];
        acc[t.projectId].push(t);
        return acc;
      }, {} as Record<string, (typeof trackings)[0][]>);

      const activeProjects = Object.keys(trackingGroupByProject).filter(
        (projectId) => {
          const trackings = trackingGroupByProject[projectId];
          const platforms = new Set(trackings.map((t) => t.platform));
          return PLATFORMS.every((platform) => platforms.has(platform));
        }
      );

      const hasInactiveProjects = allProjects.some(
        (p) => !activeProjects.includes(p.id)
      );

      // INACTIVE_PROJECTS is a recurring email (every 3 days) — no one-time guard.
      // Cadence is controlled solely by lastInformedAboutInactiveProject above.
      if (hasInactiveProjects) {
        const subject = `Your content is waiting for you`;

        const rawDashboardUrl =
          (process.env.NEXT_PUBLIC_APP_PRODUCTION_URL as string) + "/project";

        await mail.sendTemplate(
          "INACTIVE_PROJECTS",
          {
            name: user.name,
            dashboardUrl: buildTrackedUrl(rawDashboardUrl, "INACTIVE_PROJECTS"),
            stats: {
              projectCount: allProjects.length,
              platformCount: connectedPlatforms.length,
              contentCount,
            },
          },
          { subject, to: [user.email] }
        );

        await logEmail({
          userId: user.id,
          email: user.email,
          template: "INACTIVE_PROJECTS",
          subject,
          trigger: "auto",
          meta: {
            projectCount: allProjects.length,
            platformCount: connectedPlatforms.length,
            contentCount,
          },
        });
      }
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
    });

    return sendNextResponse({
      message: "User Session",
      status: 200,
      data: {
        user,
        subscription,
        isInternalAdmin: user.email === process.env.PLATFORM_OWNER_REF,
      },
    });
  })
);
