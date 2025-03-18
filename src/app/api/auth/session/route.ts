import { UserDoc } from "@/db/auth/schema/user";
import { ProjectDoc, ProjectModel } from "@/db/projects/schema/project";
import {
  ProjectTrackingDoc,
  ProjectTrackingModel,
} from "@/db/projects/schema/tracking";
import {
  SubscriptionDoc,
  SubscriptionModel,
} from "@/db/subscriptions/schema/subscription";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { mail } from "@/lib/mail";
import { PLATFORMS } from "@/lib/prompt";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateUserAuth } from "@/middlewares/validate-auth";

/**
 * Retrieve the user session
 */
export const GET = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: user is not defined
    const user = req.parsed.user as UserDoc;

    const now = new Date().getTime();
    const lastInformed = user.lastInformedAboutInactiveProject?.getTime() || 0;

    // if the user has not been informed about the inactive project in last three days, inform them
    if (lastInformed && now - lastInformed > 3 * 24 * 60 * 60 * 1000) {
      console.log("📧 Informing user about inactive project:", user.email);
      user.lastInformedAboutInactiveProject = new Date();
      await user.save();

      const allProjects: ProjectDoc[] = await ProjectModel.find({
        userId: user._id,
      });

      // get tracking of all projects for last 3 days
      const trackings: ProjectTrackingDoc[] = await ProjectTrackingModel.find({
        projectId: { $in: allProjects.map((p) => p._id) },
        date: { $gte: new Date(now - 3 * 24 * 60 * 60 * 1000) }, // last 3 days
      });

      // remove the active projects, active projects should have at least one tracking for all platforms in last 3 days

      // group trackings by project
      const trackingGroupByProject = trackings.reduce((acc, t) => {
        acc[t.projectId.toString()] = acc[t.projectId.toString()] || [];
        acc[t.projectId.toString()].push(t);
        return acc;
      }, {} as Record<string, ProjectTrackingDoc[]>);

      const activeProjects = Object.keys(trackingGroupByProject).filter(
        (projectId) => {
          const trackings = trackingGroupByProject[projectId];
          const platforms = new Set(trackings.map((t) => t.platform));
          return PLATFORMS.every((platform) => platforms.has(platform));
        }
      );

      const inactiveProjects = allProjects.filter(
        (p) => !activeProjects.includes(p._id.toString())
      );

      if (inactiveProjects.length) {
        // get all the inactive projects name and the inactive platforms for each project

        const inactiveProjectsDetails: {
          name: string;
          inactivePlatforms: string[];
        }[] = [];

        await Promise.all(
          inactiveProjects.map(async (p) => {
            const project = allProjects.find(
              (p) => p._id.toString() === p._id.toString()
            );

            if (!project) return;

            const trackings = trackingGroupByProject[p._id.toString()] || [];
            const platforms = new Set(trackings.map((t) => t.platform));
            const inactivePlatforms = PLATFORMS.filter(
              (platform) => !platforms.has(platform)
            );

            inactiveProjectsDetails.push({
              name: project.name,
              inactivePlatforms,
            });
          })
        );

        if (inactiveProjectsDetails.length) {
          // send email to user
          Promise.resolve(
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

          console.log("📧 Email sent to user:", user.email);
        }
      }
    }

    // subscription status
    const subscription: SubscriptionDoc | null =
      await SubscriptionModel.findOne({
        userId: user._id,
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
