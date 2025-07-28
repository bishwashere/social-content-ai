import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";

export const GET = applyMiddleware(
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
          projectTrackings: true,
        },
      }),
      prisma.invitedUser.findMany({
        where: { userId },
        include: {
          project: {
            include: {
              projectTrackings: true,
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

    // Calculate summary statistics
    const summary = {
      totalProjects: allProjects.length,
      totalTracking: allProjects.reduce(
        (sum, project) => sum + (project.projectTrackings?.length || 0),
        0
      ),
      projectsWithTracking: allProjects.filter(
        (project) => (project.projectTrackings?.length || 0) > 0
      ).length,
      projectsWithoutTracking: allProjects.filter(
        (project) => (project.projectTrackings?.length || 0) === 0
      ).length,
    };

    return sendNextResponse({
      status: 200,
      message: "Projects summary retrieved successfully",
      data: summary,
    });
  })
);
