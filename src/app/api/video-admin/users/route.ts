import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateVideoAdminAuth } from "@/middlewares/validate-video-admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * Get all users with their video submissions
 */
export const GET = applyMiddleware(
  validateVideoAdminAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async () => {
    // Get all users with their projects and uploaded videos
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        remainingChatGenerations: true,
        createdAt: true,
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            uploadedVideos: {
              select: {
                id: true,
                folderId: true,
                text: true,
                day: true,
                status: true,
                isPublised: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        uploadedVideos: {
          select: {
            id: true,
            folderId: true,
            text: true,
            day: true,
            status: true,
            isPublised: true,
            projectId: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Sort users by their most recent video attempt (newest first)
    const sortedUsers = [...users].sort((a, b) => {
      const aLatest = a.uploadedVideos.length > 0
        ? new Date(a.uploadedVideos[0].createdAt).getTime()
        : 0;
      const bLatest = b.uploadedVideos.length > 0
        ? new Date(b.uploadedVideos[0].createdAt).getTime()
        : 0;
      return bLatest - aLatest;
    });

    // Calculate stats
    const stats = {
      totalUsers: sortedUsers.length,
      totalVideos: sortedUsers.reduce((acc, user) => acc + user.uploadedVideos.length, 0),
      totalProjects: sortedUsers.reduce((acc, user) => acc + user.projects.length, 0),
      pendingVideos: sortedUsers.reduce(
        (acc, user) =>
          acc + user.uploadedVideos.filter((v) => v.status === "pending").length,
        0
      ),
      completedVideos: sortedUsers.reduce(
        (acc, user) =>
          acc + user.uploadedVideos.filter((v) => v.status === "completed").length,
        0
      ),
    };

    return sendNextResponse({
      status: 200,
      message: "Users fetched successfully",
      data: {
        users: sortedUsers,
        stats,
      },
    });
  })
);
