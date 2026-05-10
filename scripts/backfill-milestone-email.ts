/**
 * Backfill: send MILESTONE_REACHED emails to qualifying users.
 * Sends one email at a time, sequentially. Skips already-emailed users.
 *
 * Milestones:
 *   posts       — 10+ posts generated
 *   impressions — 1,000+ total impressions (from CampaignAnalytics)
 *   campaign    — 1+ campaign with content generated
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/backfill-milestone-email.ts
 */

import { mail } from "../src/lib/mail";
import { prisma } from "../src/lib/prisma";
import { logEmail } from "../src/lib/log-email";
import type { MilestoneType } from "../src/components/email-templates/milestone-reached";

const POSTS_THRESHOLD       = 10;
const IMPRESSIONS_THRESHOLD = 1000;
const appBaseUrl            = process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ?? "";

// Each milestone uses a distinct log template key so guards are independent
const LOG_TEMPLATE: Record<MilestoneType, string> = {
  posts:       "MILESTONE_REACHED_POSTS",
  impressions: "MILESTONE_REACHED_IMPRESSIONS",
  campaign:    "MILESTONE_REACHED_CAMPAIGN",
};

const SUBJECT: Record<MilestoneType, (name: string, value: number) => string> = {
  posts:       (name, value) => `You just hit ${value} posts. Keep it going, ${name.split(" ")[0]}`,
  impressions: (name, value) => `${value.toLocaleString()} impressions and counting, ${name.split(" ")[0]}`,
  campaign:    (name)        => `Campaign complete. Here's what you built, ${name.split(" ")[0]}`,
};

async function getUserStats(userId: string, projectIds: string[]) {
  const [totalPosts, totalCampaigns, impressionsResult] = await Promise.all([
    prisma.campaignChat.count({ where: { planner: { project: { userId } } } }),
    prisma.campaignPlanner.count({ where: { project: { userId } } }),
    prisma.campaignAnalytics.aggregate({
      where: { projectId: { in: projectIds } },
      _sum: { totalImpressions: true },
    }),
  ]);
  return {
    totalPosts,
    totalCampaigns,
    totalImpressions: impressionsResult._sum.totalImpressions ?? 0,
  };
}

async function sendMilestone(
  user: { id: string; name: string; email: string },
  milestoneType: MilestoneType,
  milestoneValue: number,
  projectName: string,
  projectId: string,
  userStats: { totalPosts: number; totalImpressions: number; totalCampaigns: number }
) {
  const logTemplate = LOG_TEMPLATE[milestoneType];
  const subject     = SUBJECT[milestoneType](user.name, milestoneValue);
  const dashboardUrl = `${appBaseUrl}/project/${projectId}`;

  await mail.sendTemplate(
    "MILESTONE_REACHED",
    { name: user.name, milestoneType, milestoneValue, projectName, userStats, dashboardUrl },
    { subject, to: [user.email] }
  );

  await logEmail({
    userId:   user.id,
    email:    user.email,
    template: logTemplate,
    subject,
    trigger:  "manual_backfill",
    meta:     { milestoneType, milestoneValue, projectName },
  });
}

async function main() {
  const alreadySent = {
    posts: new Set(
      (await prisma.emailLog.findMany({ where: { template: "MILESTONE_REACHED_POSTS" }, select: { userId: true } }))
        .map((r) => r.userId)
    ),
    impressions: new Set(
      (await prisma.emailLog.findMany({ where: { template: "MILESTONE_REACHED_IMPRESSIONS" }, select: { userId: true } }))
        .map((r) => r.userId)
    ),
    campaign: new Set(
      (await prisma.emailLog.findMany({ where: { template: "MILESTONE_REACHED_CAMPAIGN" }, select: { userId: true } }))
        .map((r) => r.userId)
    ),
  };

  const allUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true },
  });

  let postsSent = 0, impressionsSent = 0, campaignSent = 0;

  console.log(`\nChecking ${allUsers.length} users...\n`);

  for (const user of allUsers) {
    const projects = await prisma.projects.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

    if (projects.length === 0) continue;

    const projectIds   = projects.map((p) => p.id);
    const firstProject = projects[0];
    const userStats    = await getUserStats(user.id, projectIds);

    // ── posts milestone ──────────────────────────────────────────────────────
    if (!alreadySent.posts.has(user.id) && userStats.totalPosts >= POSTS_THRESHOLD) {
      try {
        await sendMilestone(user, "posts", userStats.totalPosts, firstProject.name, firstProject.id, userStats);
        postsSent++;
        console.log(`[posts]       Sent → ${user.email} (${userStats.totalPosts} posts)`);
      } catch (err) {
        console.error(`[posts][ERR]  ${user.email} — ${(err as Error).message}`);
      }
    }

    // ── impressions milestone ────────────────────────────────────────────────
    if (!alreadySent.impressions.has(user.id) && userStats.totalImpressions >= IMPRESSIONS_THRESHOLD) {
      try {
        await sendMilestone(user, "impressions", userStats.totalImpressions, firstProject.name, firstProject.id, userStats);
        impressionsSent++;
        console.log(`[impressions] Sent → ${user.email} (${userStats.totalImpressions.toLocaleString()} impressions)`);
      } catch (err) {
        console.error(`[impressions][ERR] ${user.email} — ${(err as Error).message}`);
      }
    }

    // ── campaign milestone ───────────────────────────────────────────────────
    if (!alreadySent.campaign.has(user.id)) {
      const completedCampaigns = await prisma.campaignPlanner.count({
        where: { project: { userId: user.id }, chats: { some: {} } },
      });
      if (completedCampaigns >= 1) {
        try {
          await sendMilestone(user, "campaign", completedCampaigns, firstProject.name, firstProject.id, userStats);
          campaignSent++;
          console.log(`[campaign]    Sent → ${user.email} (${completedCampaigns} campaigns)`);
        } catch (err) {
          console.error(`[campaign][ERR] ${user.email} — ${(err as Error).message}`);
        }
      }
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log(`Done.`);
  console.log(`  Posts milestone       : ${postsSent} sent`);
  console.log(`  Impressions milestone : ${impressionsSent} sent`);
  console.log(`  Campaign milestone    : ${campaignSent} sent`);
  console.log("═".repeat(60) + "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
