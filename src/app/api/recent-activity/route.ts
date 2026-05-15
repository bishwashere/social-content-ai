import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import catchApiAsyncError from "@/lib/catch-api-async-error";

const PLATFORM_ABBR: Record<string, string> = {
  facebook: "FB",
  instagram: "IG",
  twitter: "X",
  linkedin: "LI",
  threads: "Threads",
  reddit: "Reddit",
  tiktok: "TikTok",
};

function platformLabel(platform: string): string {
  return PLATFORM_ABBR[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

export async function GET(request: NextRequest) {
  return applyMiddleware(
    validateUserAuth({ errorIfNotAuthenticated: true }),
    catchApiAsyncError(async (req) => {
      try {
        //@ts-expect-error: user is not defined in Request type
        const user = req.parsed.user;

        const userProjects = await prisma.projects.findMany({
          where: {
            OR: [
              { userId: user.id },
              { invitedUsers: { some: { userId: user.id } } },
            ],
          },
          select: { id: true, name: true, userId: true, createdAt: true },
        });

        const projectIds = userProjects.map((p) => p.id);
        const ownedProjectIds = userProjects.filter((p) => p.userId === user.id).map((p) => p.id);

        if (projectIds.length === 0) {
          return NextResponse.json([]);
        }

        const activities: object[] = [];

        // ── 1. Posts published (PlatformPost) ────────────────────────────────
        const recentPosts = await prisma.platformPost.findMany({
          where: { oauthProvider: { userId: user.id } },
          include: { oauthProvider: { select: { platform: true, id: true } } },
          orderBy: { date: "desc" },
          take: 30,
        });

        const oauthProviderIds = [...new Set(recentPosts.map((p) => p.oauthProviderId))];
        const projectProviders = await prisma.projectToOAuthProvider.findMany({
          where: {
            oauthProviderId: { in: oauthProviderIds },
            projectId: { in: projectIds },
          },
          include: { project: { select: { id: true, name: true } } },
        });
        const providerToProject = new Map(projectProviders.map((p) => [p.oauthProviderId, p]));

        for (const post of recentPosts) {
          const pp = providerToProject.get(post.oauthProviderId);
          if (pp?.project) {
            activities.push({
              type: "posted",
              icon: "✔️",
              message: `Posted on ${platformLabel(post.oauthProvider.platform)}`,
              projectName: pp.project.name,
              projectId: pp.project.id,
              timestamp: post.date.toISOString(),
              platform: post.oauthProvider.platform,
            });
          }
        }

        // ── 2. Failed scheduled posts (no content — missed/no template) ───────
        const failedPosts = await prisma.scheduledPost.findMany({
          where: {
            projectId: { in: projectIds },
            status: "failed",
            date: { lte: new Date() },
          },
          include: { project: { select: { id: true, name: true } } },
          orderBy: { date: "desc" },
          take: 15,
        });

        for (const post of failedPosts) {
          const hasContent = post.content && post.content.trim().length > 0;
          if (!hasContent) {
            activities.push({
              type: "scheduled_missed",
              icon: "⚠️",
              message: `Scheduled post missed — no template available`,
              projectName: post.project?.name ?? "Unknown Project",
              projectId: post.projectId,
              timestamp: post.date.toISOString(),
              platform: post.platform,
            });
          } else {
            // ── 3. Failed scheduled posts (had content but still failed) ────
            activities.push({
              type: "post_failed",
              icon: "❌",
              message: `Post failed to publish on ${platformLabel(post.platform)}`,
              projectName: post.project?.name ?? "Unknown Project",
              projectId: post.projectId,
              timestamp: post.date.toISOString(),
              platform: post.platform,
            });
          }
        }

        // ── 4. Upcoming scheduled posts (created recently, pending) ──────────
        const upcomingPosts = await prisma.scheduledPost.findMany({
          where: {
            projectId: { in: projectIds },
            status: "pending",
            date: { gte: new Date() },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          include: { project: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        for (const post of upcomingPosts) {
          activities.push({
            type: "post_scheduled",
            icon: "📅",
            message: `Post scheduled on ${platformLabel(post.platform)}`,
            projectName: post.project?.name ?? "Unknown Project",
            projectId: post.projectId,
            timestamp: post.createdAt.toISOString(),
            platform: post.platform,
          });
        }

        // ── 5. Drafts ready (GENERATED campaign content, not yet scheduled) ──
        const drafts = await prisma.campaignChat.findMany({
          where: {
            planner: { projectId: { in: projectIds } },
            status: "GENERATED",
            contents: { not: {} },
          },
          include: {
            planner: {
              include: { project: { select: { id: true, name: true } } },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 10,
        });

        const allScheduledPostsMeta = await prisma.scheduledPost.findMany({
          where: { projectId: { in: projectIds } },
          select: { projectId: true, meta: true },
        });

        const scheduledCampaignDays = new Set<string>();
        for (const post of allScheduledPostsMeta) {
          const meta = post.meta as Record<string, unknown> | null;
          if (meta?.campaignId && meta?.day) {
            scheduledCampaignDays.add(`${post.projectId}-${meta.campaignId}-${meta.day}`);
          }
        }

        const projectsWithDraft = new Set<string>();
        for (const draft of drafts) {
          if (!draft.planner) continue;
          if (projectsWithDraft.has(draft.planner.projectId)) continue;
          const key = `${draft.planner.projectId}-${draft.plannerId}-${draft.day}`;
          if (!scheduledCampaignDays.has(key)) {
            projectsWithDraft.add(draft.planner.projectId);
            activities.push({
              type: "draft_ready",
              icon: "🟣",
              message: "Content ready and waiting for publish",
              projectName: draft.planner.project?.name ?? "Unknown Project",
              projectId: draft.planner.projectId,
              timestamp: draft.updatedAt.toISOString(),
              campaignId: draft.plannerId,
              day: draft.day,
            });
          }
        }

        // ── 6. Videos completed ───────────────────────────────────────────────
        const completedVideos = await prisma.uploadedVideo.findMany({
          where: { userId: user.id, status: "completed" },
          include: { project: { select: { id: true, name: true } } },
          orderBy: { updatedAt: "desc" },
          take: 10,
        });

        for (const video of completedVideos) {
          if (!video.projectId || !projectIds.includes(video.projectId)) continue;
          activities.push({
            type: "video_completed",
            icon: "🎥",
            message: `Video completed — ${video.text || "Video"}`,
            projectName: video.project?.name ?? "Unknown Project",
            projectId: video.projectId,
            timestamp: video.updatedAt.toISOString(),
            videoId: video.id,
          });
        }

        // ── 7. Collaborators who joined your projects ─────────────────────────
        if (ownedProjectIds.length > 0) {
          const collaborators = await prisma.invitedUser.findMany({
            where: { projectId: { in: ownedProjectIds } },
            include: {
              user: { select: { name: true, email: true } },
              project: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          for (const collab of collaborators) {
            const who = collab.user?.name ?? collab.user?.email ?? "Someone";
            activities.push({
              type: "collaborator_joined",
              icon: "👥",
              message: `${who} joined as collaborator`,
              projectName: collab.project?.name ?? "Unknown Project",
              projectId: collab.projectId,
              timestamp: collab.createdAt.toISOString(),
            });
          }
        }

        // ── 8. Projects created (owned) ───────────────────────────────────────
        for (const project of userProjects) {
          if (project.userId !== user.id) continue;
          activities.push({
            type: "project_created",
            icon: "📁",
            message: `Project "${project.name}" created`,
            projectName: project.name,
            projectId: project.id,
            timestamp: project.createdAt.toISOString(),
          });
        }

        // ── 9. Campaigns created ──────────────────────────────────────────────
        const campaigns = await prisma.campaignPlanner.findMany({
          where: { projectId: { in: projectIds } },
          include: { project: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        for (const campaign of campaigns) {
          activities.push({
            type: "campaign_created",
            icon: "🗓️",
            message: `Campaign "${campaign.name ?? campaign.goal}" created`,
            projectName: campaign.project?.name ?? "Unknown Project",
            projectId: campaign.projectId,
            timestamp: campaign.createdAt.toISOString(),
            campaignId: campaign.id,
          });
        }

        // ── 10. Social accounts connected ─────────────────────────────────────
        const connectedAccounts = await prisma.oauthProvider.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        for (const account of connectedAccounts) {
          const label = platformLabel(account.platform);
          const accountName = account.pageName ?? label;
          activities.push({
            type: "social_connected",
            icon: "🔗",
            message: `${accountName} connected on ${label}`,
            projectName: "",
            projectId: "",
            timestamp: account.createdAt.toISOString(),
            platform: account.platform,
          });
        }

        // ── 11. Subscription expiring within 7 days ───────────────────────────
        const subscription = await prisma.subscription.findFirst({
          where: { userId: user.id, status: "active" },
          orderBy: { endsAt: "desc" },
        });

        if (subscription) {
          const daysLeft = Math.ceil(
            (subscription.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (daysLeft <= 7 && daysLeft >= 0) {
            activities.push({
              type: "subscription_expiring",
              icon: "💳",
              message: daysLeft === 0
                ? "Your subscription expires today"
                : `Your subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
              projectName: "",
              projectId: "",
              timestamp: new Date().toISOString(),
            });
          }
        }

        // ── 12. Pulse score improved ──────────────────────────────────────────
        for (const project of userProjects) {
          const pulseRecords = await prisma.projectPulse.findMany({
            where: { projectId: project.id },
            orderBy: { createdAt: "desc" },
            take: 2,
          });

          if (pulseRecords.length === 2) {
            const [latest, previous] = pulseRecords;
            const improvement = latest.pulse - previous.pulse;
            if (improvement >= 5) {
              activities.push({
                type: "pulse_improved",
                icon: "📈",
                message: `Pulse score up by ${Math.round(improvement)} points`,
                projectName: project.name,
                projectId: project.id,
                timestamp: latest.createdAt.toISOString(),
              });
            }
          }
        }

        // ── 13. Top performing posts ──────────────────────────────────────────
        const topPosts = await prisma.platformPost.findMany({
          where: {
            oauthProvider: { userId: user.id },
            OR: [
              { likes: { gte: 50 } },
              { impressions: { gte: 500 } },
            ],
          },
          include: { oauthProvider: { select: { platform: true, id: true } } },
          orderBy: { likes: "desc" },
          take: 5,
        });

        for (const post of topPosts) {
          const pp = providerToProject.get(post.oauthProviderId);
          if (pp?.project) {
            const metric = post.impressions && post.impressions >= 500
              ? `${post.impressions.toLocaleString()} impressions`
              : `${post.likes} likes`;
            activities.push({
              type: "post_performing",
              icon: "🔥",
              message: `Post is performing well — ${metric} on ${platformLabel(post.oauthProvider.platform)}`,
              projectName: pp.project.name,
              projectId: pp.project.id,
              timestamp: post.date.toISOString(),
              platform: post.oauthProvider.platform,
            });
          }
        }

        // ── Sort ──────────────────────────────────────────────────────────────
        activities.sort(
          (a, b) =>
            new Date((b as { timestamp: string }).timestamp).getTime() -
            new Date((a as { timestamp: string }).timestamp).getTime()
        );

        // ── Pagination ────────────────────────────────────────────────────────
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 200);
        const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);
        const total = activities.length;
        const page = activities.slice(offset, offset + limit);

        return NextResponse.json({ items: page, total, offset, limit });
      } catch (error) {
        console.error("❌ Recent Activity API - Error:", error);
        throw error;
      }
    })
  )(request, { params: {} });
}
