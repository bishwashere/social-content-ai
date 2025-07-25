import { ProjectTrackingResponse } from "@/backend-apis/projects/types";
import { User } from "@/db/auth/schema/user";
import {
  InvitedUserDoc,
  InvitedUserModel,
} from "@/db/projects/schema/invited-users";
import { ProjectDoc, ProjectModel } from "@/db/projects/schema/project";
import { ProjectTrackingModel } from "@/db/projects/schema/tracking";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateUserAuth } from "@/middlewares/validate-auth";

/**
 * Get the summary of all projects to show on the dashboard
 */
export const GET = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: ................
    const user = req.parsed.user as User;

    const invitedProjects: Pick<InvitedUserDoc, "projectId">[] =
      await InvitedUserModel.find({
        userId: user._id,
      }).select("projectId");

    const projects: ProjectDoc[] = await ProjectModel.find({
      $or: [
        {
          userId: user._id,
        },
        {
          _id: {
            $in: invitedProjects.map(
              (invitedProject) => invitedProject.projectId,
            ),
          },
        },
      ],
    }).sort({ createdAt: -1 });

    const projectIds = projects.map((p) => p._id.toString());

    const trackings:ProjectTrackingResponse = await ProjectTrackingModel.find({
      projectId: { $in: projectIds },
    });

    const totalProjects = projects.length;

    const totalPostsForEachProject = projects.map((p) => ({
      name: p.name as string,
      count: trackings.filter(
        (t) => t.projectId.toString() === p._id.toString(),
      ).length,
      trackings: trackings.filter(
        (t) => t.projectId.toString() === p._id.toString(),
      ),
    }));

    const mostActiveProject = totalPostsForEachProject.reduce(
      //@ts-expect-error: ...
      (max, project) => (project.count > (max?.count || 0) ? project : max),
      null,
    );

    const platformCounts: Record<string, number> = {};
    trackings.forEach((t) => {
      platformCounts[t.platform] = (platformCounts[t.platform] || 0) + 1;
    });

    const totalPlatforms = Object.keys(platformCounts).length;
    const activePlatforms = Object.values(platformCounts).filter(
      (count) => count > 0,
    ).length;
    const inactivePlatforms = totalPlatforms - activePlatforms;

    return sendNextResponse({
      status: 200,
      message: "Projects Summary",
      data: {
        totalProjects,
        activePlatforms,
        inactivePlatforms,
        totalPlatforms,
        totalPostsForEachProject,
        mostActiveProject,
      },
    });
  }),
);
