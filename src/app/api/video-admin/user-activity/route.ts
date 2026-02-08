import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateVideoAdminAuth } from "@/middlewares/validate-video-admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * Get the latest 5 signed-up users with all their activities
 * aggregated into a unified timeline
 */
export const GET = applyMiddleware(
  validateVideoAdminAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async () => {
    // Get all users with all related activity data (latest first)
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        remainingChatGenerations: true,
        hasClaimedFreeTrial: true,
        guidedTourEnabled: true,
        // Projects and nested data
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            // Campaigns in this project
            campaignPlanners: {
              select: {
                id: true,
                name: true,
                goal: true,
                targetAudience: true,
                platforms: true,
                createdAt: true,
                _count: { select: { chats: true } },
              },
              orderBy: { createdAt: "desc" },
            },
            // Quick Generate chats in this project
            projectChats: {
              select: {
                id: true,
                title: true,
                prompt: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
            // Scheduled posts
            scheduledPosts: {
              select: {
                id: true,
                platform: true,
                content: true,
                status: true,
                date: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
            // Uploaded videos in this project
            uploadedVideos: {
              select: {
                id: true,
                text: true,
                status: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
            // Walls
            walls: {
              select: {
                id: true,
                platform: true,
                content: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        // OAuth providers (connected social accounts)
        oauthProviders: {
          select: {
            id: true,
            platform: true,
            pageName: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        // Standalone uploaded videos (no project)
        uploadedVideos: {
          select: {
            id: true,
            text: true,
            status: true,
            projectId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        // Subscriptions
        subscriptions: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            endsAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        // Feature requests
        featureRequests: {
          select: {
            id: true,
            message: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Build a unified activity timeline for each user
    const usersWithTimeline = users.map((user) => {
      const activities: Array<{
        type: string;
        label: string;
        detail: string;
        timestamp: Date;
        meta?: Record<string, unknown>;
      }> = [];

      // Sign up
      activities.push({
        type: "signup",
        label: "Signed up",
        detail: `Joined as ${user.email}`,
        timestamp: user.createdAt,
      });

      // Projects created
      for (const project of user.projects) {
        activities.push({
          type: "project_created",
          label: "Created project",
          detail: project.name,
          timestamp: project.createdAt,
          meta: { projectId: project.id, description: project.description },
        });

        // Campaigns within project
        for (const campaign of project.campaignPlanners) {
          activities.push({
            type: "campaign_created",
            label: "Created campaign",
            detail: `${campaign.name || campaign.goal} (in ${project.name})`,
            timestamp: campaign.createdAt,
            meta: {
              projectName: project.name,
              platforms: campaign.platforms,
              targetAudience: campaign.targetAudience,
              totalDays: campaign._count.chats,
            },
          });
        }

        // Quick Generate
        for (const chat of project.projectChats) {
          activities.push({
            type: "quick_generate",
            label: "Quick Generate",
            detail: `"${chat.title}"${chat.prompt ? ` — Prompt: ${chat.prompt.slice(0, 80)}${chat.prompt.length > 80 ? "..." : ""}` : ""} (in ${project.name})`,
            timestamp: chat.createdAt,
          });
        }

        // Scheduled posts
        for (const post of project.scheduledPosts) {
          activities.push({
            type: "post_scheduled",
            label: "Scheduled post",
            detail: `${post.platform} — ${post.content.slice(0, 80)}${post.content.length > 80 ? "..." : ""} [${post.status}]`,
            timestamp: post.createdAt,
            meta: { platform: post.platform, status: post.status },
          });
        }

        // Videos in project
        for (const video of project.uploadedVideos) {
          activities.push({
            type: "video_created",
            label: "Generated video",
            detail: `${video.text.slice(0, 80)}${video.text.length > 80 ? "..." : ""} [${video.status}] (in ${project.name})`,
            timestamp: video.createdAt,
            meta: { status: video.status },
          });
        }

        // Walls
        for (const wall of project.walls) {
          activities.push({
            type: "wall_post",
            label: "Wall post",
            detail: `${wall.platform} — ${wall.content.slice(0, 80)}${wall.content.length > 80 ? "..." : ""}`,
            timestamp: wall.createdAt,
          });
        }
      }

      // OAuth providers (connected accounts)
      for (const oauth of user.oauthProviders) {
        activities.push({
          type: "account_connected",
          label: "Connected account",
          detail: `${oauth.platform}${oauth.pageName ? ` — ${oauth.pageName}` : ""}`,
          timestamp: oauth.createdAt,
          meta: { platform: oauth.platform },
        });
      }

      // Standalone videos (no project)
      for (const video of user.uploadedVideos.filter((v) => !v.projectId)) {
        activities.push({
          type: "video_created",
          label: "Generated video (standalone)",
          detail: `${video.text.slice(0, 80)}${video.text.length > 80 ? "..." : ""} [${video.status}]`,
          timestamp: video.createdAt,
          meta: { status: video.status },
        });
      }

      // Subscriptions
      for (const sub of user.subscriptions) {
        activities.push({
          type: "subscription",
          label: "Subscription",
          detail: `Status: ${sub.status}`,
          timestamp: sub.createdAt,
          meta: { status: sub.status, startedAt: sub.startedAt, endsAt: sub.endsAt },
        });
      }

      // Feature requests
      for (const fr of user.featureRequests) {
        activities.push({
          type: "feature_request",
          label: "Feature request",
          detail: fr.message.slice(0, 120) + (fr.message.length > 120 ? "..." : ""),
          timestamp: fr.createdAt,
        });
      }

      // Sort activities by timestamp descending (latest first)
      activities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Summary counts
      const summary = {
        projects: user.projects.length,
        campaigns: user.projects.reduce(
          (sum, p) => sum + p.campaignPlanners.length,
          0
        ),
        quickGenerates: user.projects.reduce(
          (sum, p) => sum + p.projectChats.length,
          0
        ),
        scheduledPosts: user.projects.reduce(
          (sum, p) => sum + p.scheduledPosts.length,
          0
        ),
        videos: user.uploadedVideos.length,
        connectedAccounts: user.oauthProviders.length,
        subscriptions: user.subscriptions.length,
        featureRequests: user.featureRequests.length,
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        remainingChatGenerations: user.remainingChatGenerations,
        hasClaimedFreeTrial: user.hasClaimedFreeTrial,
        summary,
        activities,
      };
    });

    return sendNextResponse({
      status: 200,
      message: "User activity fetched successfully",
      data: { users: usersWithTimeline },
    });
  })
);
