import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { mail } from "@/lib/mail";
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

    if (lastInformed && now - lastInformed > 3 * 24 * 60 * 60 * 1000) {
      const allProjects = await prisma.projects.findMany({
        where: { userId: user.id },
      });

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

      const inactiveProjects = allProjects.filter(
        (p) => !activeProjects.includes(p.id)
      );

      if (inactiveProjects.length) {
        const inactiveProjectsDetails: {
          name: string;
          inactivePlatforms: string[];
        }[] = [];

        await Promise.all(
          inactiveProjects.map(async (p) => {
            const trackings = trackingGroupByProject[p.id] || [];
            const platforms = new Set(trackings.map((t) => t.platform));
            const inactivePlatforms = PLATFORMS.filter(
              (platform) => !platforms.has(platform)
            );

            inactiveProjectsDetails.push({
              name: p.name,
              inactivePlatforms,
            });
          })
        );

        if (inactiveProjectsDetails.length) {
          await Promise.resolve(
            mail.sendTemplate(
              "INACTIVE_PROJECTS",
              {
                name: user.name,
                dashboardUrl:
                  (process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL as string) +
                  "/project/dashboard",
                inactiveProjectsDetails,
              },
              {
                subject: `Inactive Project Alert`,
                to: [user.email],
              }
            )
          );
        }
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
      },
    });
  })
);
