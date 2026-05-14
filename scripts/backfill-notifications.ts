/**
 * Backfill historical notifications for all existing users.
 *
 * Safe to re-run — uses upsert with (userId, type, sourceId) unique key,
 * so no duplicates are ever created.
 *
 * Run:  npx tsx scripts/backfill-notifications.ts
 */

import { prisma } from "../src/lib/prisma";

const PLATFORM_ABBR: Record<string, string> = {
  facebook: "FB",
  instagram: "IG",
  twitter: "X",
  linkedin: "LI",
  threads: "Threads",
  reddit: "Reddit",
  tiktok: "TikTok",
};
function pl(platform: string) {
  return PLATFORM_ABBR[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────

type NotificationInput = {
  userId: string;
  type: string;
  sourceId: string;
  icon: string;
  message: string;
  projectName: string;
  projectId: string;
  platform?: string;
  campaignId?: string;
  videoId?: string;
  day?: number;
  timestamp: Date;
};

async function upsertMany(notifications: NotificationInput[]) {
  let created = 0;
  let skipped = 0;
  for (const n of notifications) {
    try {
      await prisma.notification.upsert({
        where: {
          userId_type_sourceId: {
            userId: n.userId,
            type: n.type,
            sourceId: n.sourceId,
          },
        },
        update: {},
        create: {
          userId: n.userId,
          type: n.type,
          sourceId: n.sourceId,
          icon: n.icon,
          message: n.message,
          projectName: n.projectName,
          projectId: n.projectId,
          platform: n.platform,
          campaignId: n.campaignId,
          videoId: n.videoId,
          day: n.day,
          timestamp: n.timestamp,
        },
      });
      created++;
    } catch {
      skipped++;
    }
  }
  return { created, skipped };
}

// ── per-user backfill ─────────────────────────────────────────────────────────

async function backfillUser(userId: string): Promise<number> {
  const notifications: NotificationInput[] = [];

  const userProjects = await prisma.projects.findMany({
    where: {
      OR: [
        { userId },
        { invitedUsers: { some: { userId } } },
      ],
    },
    select: { id: true, name: true, userId: true, createdAt: true },
  });

  const projectIds = userProjects.map((p) => p.id);
  const ownedProjectIds = userProjects.filter((p) => p.userId === userId).map((p) => p.id);

  if (projectIds.length === 0) return 0;

  // ── 1. Posts published ────────────────────────────────────────────────────
  const recentPosts = await prisma.platformPost.findMany({
    where: { oauthProvider: { userId } },
    include: { oauthProvider: { select: { platform: true, id: true } } },
    orderBy: { date: "desc" },
  });

  const oauthProviderIds = [...new Set(recentPosts.map((p) => p.oauthProviderId))];
  const projectProviders = await prisma.projectToOAuthProvider.findMany({
    where: { oauthProviderId: { in: oauthProviderIds }, projectId: { in: projectIds } },
    include: { project: { select: { id: true, name: true } } },
  });
  const providerToProject = new Map(projectProviders.map((p) => [p.oauthProviderId, p]));

  for (const post of recentPosts) {
    const pp = providerToProject.get(post.oauthProviderId);
    if (pp?.project) {
      notifications.push({
        userId,
        type: "posted",
        sourceId: post.id,
        icon: "✔️",
        message: `Posted on ${pl(post.oauthProvider.platform)}`,
        projectName: pp.project.name,
        projectId: pp.project.id,
        platform: post.oauthProvider.platform,
        timestamp: post.date,
      });
    }
  }

  // ── 2 & 3. Scheduled post failures ───────────────────────────────────────
  const failedPosts = await prisma.scheduledPost.findMany({
    where: { projectId: { in: projectIds }, status: "failed", date: { lte: new Date() } },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  for (const post of failedPosts) {
    const hasContent = post.content && post.content.trim().length > 0;
    if (!hasContent) {
      notifications.push({
        userId,
        type: "scheduled_missed",
        sourceId: post.id,
        icon: "⚠️",
        message: "Scheduled post missed — no template available",
        projectName: post.project?.name ?? "",
        projectId: post.projectId,
        platform: post.platform,
        timestamp: post.date,
      });
    } else {
      notifications.push({
        userId,
        type: "post_failed",
        sourceId: post.id,
        icon: "❌",
        message: `Post failed to publish on ${pl(post.platform)}`,
        projectName: post.project?.name ?? "",
        projectId: post.projectId,
        platform: post.platform,
        timestamp: post.date,
      });
    }
  }

  // ── 4. Posts scheduled (past — already fired, still informational) ────────
  const scheduledPosts = await prisma.scheduledPost.findMany({
    where: { projectId: { in: projectIds }, status: "pending" },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  for (const post of scheduledPosts) {
    notifications.push({
      userId,
      type: "post_scheduled",
      sourceId: post.id,
      icon: "📅",
      message: `Post scheduled on ${pl(post.platform)}`,
      projectName: post.project?.name ?? "",
      projectId: post.projectId,
      platform: post.platform,
      timestamp: post.createdAt,
    });
  }

  // ── 5. Drafts ready ───────────────────────────────────────────────────────
  const drafts = await prisma.campaignChat.findMany({
    where: {
      planner: { projectId: { in: projectIds } },
      status: "GENERATED",
      contents: { not: {} },
    },
    include: { planner: { include: { project: { select: { id: true, name: true } } } } },
    orderBy: { updatedAt: "desc" },
  });

  const allScheduledMeta = await prisma.scheduledPost.findMany({
    where: { projectId: { in: projectIds } },
    select: { projectId: true, meta: true },
  });
  const scheduledCampaignDays = new Set<string>();
  for (const post of allScheduledMeta) {
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
      notifications.push({
        userId,
        type: "draft_ready",
        sourceId: `${draft.plannerId}-${draft.day}`,
        icon: "🟣",
        message: "Content ready and waiting for publish",
        projectName: draft.planner.project?.name ?? "",
        projectId: draft.planner.projectId,
        campaignId: draft.plannerId,
        day: draft.day,
        timestamp: draft.updatedAt,
      });
    }
  }

  // ── 6. Videos completed ───────────────────────────────────────────────────
  const videos = await prisma.uploadedVideo.findMany({
    where: { userId, status: "completed" },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  for (const video of videos) {
    if (!video.projectId || !projectIds.includes(video.projectId)) continue;
    notifications.push({
      userId,
      type: "video_completed",
      sourceId: video.id,
      icon: "🎥",
      message: `Video completed — ${video.text || "Video"}`,
      projectName: video.project?.name ?? "",
      projectId: video.projectId ?? "",
      videoId: video.id,
      timestamp: video.updatedAt,
    });
  }

  // ── 7. Collaborators who joined owned projects ────────────────────────────
  if (ownedProjectIds.length > 0) {
    const collaborators = await prisma.invitedUser.findMany({
      where: { projectId: { in: ownedProjectIds } },
      include: {
        user: { select: { name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    for (const c of collaborators) {
      const who = c.user?.name ?? c.user?.email ?? "Someone";
      notifications.push({
        userId,
        type: "collaborator_joined",
        sourceId: c.id,
        icon: "👥",
        message: `${who} joined as collaborator`,
        projectName: c.project?.name ?? "",
        projectId: c.projectId,
        timestamp: c.createdAt,
      });
    }
  }

  // ── 8. Projects created ───────────────────────────────────────────────────
  for (const project of userProjects) {
    if (project.userId !== userId) continue;
    notifications.push({
      userId,
      type: "project_created",
      sourceId: project.id,
      icon: "📁",
      message: `Project "${project.name}" created`,
      projectName: project.name,
      projectId: project.id,
      timestamp: project.createdAt,
    });
  }

  // ── 9. Campaigns created ──────────────────────────────────────────────────
  const campaigns = await prisma.campaignPlanner.findMany({
    where: { projectId: { in: projectIds } },
    include: { project: { select: { id: true, name: true } } },
  });

  for (const c of campaigns) {
    notifications.push({
      userId,
      type: "campaign_created",
      sourceId: c.id,
      icon: "🗓️",
      message: `Campaign "${c.name ?? c.goal}" created`,
      projectName: c.project?.name ?? "",
      projectId: c.projectId,
      campaignId: c.id,
      timestamp: c.createdAt,
    });
  }

  // ── 10. Social accounts connected ─────────────────────────────────────────
  const accounts = await prisma.oauthProvider.findMany({
    where: { userId },
  });

  for (const a of accounts) {
    notifications.push({
      userId,
      type: "social_connected",
      sourceId: a.id,
      icon: "🔗",
      message: `${a.pageName ?? pl(a.platform)} connected on ${pl(a.platform)}`,
      projectName: "",
      projectId: "",
      platform: a.platform,
      timestamp: a.createdAt,
    });
  }

  // ── 11. Subscription expiring ─────────────────────────────────────────────
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { endsAt: "desc" },
  });

  if (sub) {
    const daysLeft = Math.ceil((sub.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7 && daysLeft >= 0) {
      notifications.push({
        userId,
        type: "subscription_expiring",
        sourceId: sub.id,
        icon: "💳",
        message: daysLeft === 0
          ? "Your subscription expires today"
          : `Your subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        projectName: "",
        projectId: "",
        timestamp: new Date(),
      });
    }
  }

  // ── 12. Pulse improved ────────────────────────────────────────────────────
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
        notifications.push({
          userId,
          type: "pulse_improved",
          sourceId: latest.id,
          icon: "📈",
          message: `Pulse score up by ${Math.round(improvement)} points`,
          projectName: project.name,
          projectId: project.id,
          timestamp: latest.createdAt,
        });
      }
    }
  }

  // ── 13. Top performing posts ──────────────────────────────────────────────
  const topPosts = await prisma.platformPost.findMany({
    where: {
      oauthProvider: { userId },
      OR: [{ likes: { gte: 50 } }, { impressions: { gte: 500 } }],
    },
    include: { oauthProvider: { select: { platform: true, id: true } } },
    orderBy: { likes: "desc" },
    take: 10,
  });

  for (const post of topPosts) {
    const pp = providerToProject.get(post.oauthProviderId);
    if (pp?.project) {
      const metric =
        post.impressions && post.impressions >= 500
          ? `${post.impressions.toLocaleString()} impressions`
          : `${post.likes} likes`;
      notifications.push({
        userId,
        type: "post_performing",
        sourceId: post.id,
        icon: "🔥",
        message: `Post performing well — ${metric} on ${pl(post.oauthProvider.platform)}`,
        projectName: pp.project.name,
        projectId: pp.project.id,
        platform: post.oauthProvider.platform,
        timestamp: post.date,
      });
    }
  }

  // ── Write to DB ───────────────────────────────────────────────────────────
  const { created } = await upsertMany(notifications);
  return created;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔔 Starting notification backfill…\n");

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`Found ${users.length} user(s)\n`);

  let totalCreated = 0;
  let processed = 0;

  for (const user of users) {
    const created = await backfillUser(user.id);
    totalCreated += created;
    processed++;
    if (created > 0) {
      console.log(`  ✅  ${user.email} — ${created} notification(s) written`);
    } else {
      console.log(`  ⚪  ${user.email} — nothing to backfill`);
    }

    // Progress every 10 users
    if (processed % 10 === 0) {
      console.log(`\n  [${processed}/${users.length}] processed so far…\n`);
    }
  }

  console.log(`\n✨ Done. ${totalCreated} notification(s) created across ${users.length} user(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
