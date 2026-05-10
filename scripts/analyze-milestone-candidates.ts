/**
 * Analysis only — no emails sent.
 * Counts how many users qualify for each milestone and haven't been emailed yet.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/analyze-milestone-candidates.ts
 */

import { prisma } from "../src/lib/prisma";

const POSTS_THRESHOLD       = 10;
const IMPRESSIONS_THRESHOLD = 1000;

async function main() {
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  const alreadySentPosts = new Set(
    (await prisma.emailLog.findMany({ where: { template: "MILESTONE_REACHED_POSTS" }, select: { userId: true } }))
      .map((r) => r.userId)
  );
  const alreadySentImpressions = new Set(
    (await prisma.emailLog.findMany({ where: { template: "MILESTONE_REACHED_IMPRESSIONS" }, select: { userId: true } }))
      .map((r) => r.userId)
  );
  const alreadySentCampaign = new Set(
    (await prisma.emailLog.findMany({ where: { template: "MILESTONE_REACHED_CAMPAIGN" }, select: { userId: true } }))
      .map((r) => r.userId)
  );

  let postsCount = 0;
  let impressionsCount = 0;
  let campaignCount = 0;

  for (const user of allUsers) {
    // ── posts milestone ────────────────────────────────────────────────────
    if (!alreadySentPosts.has(user.id)) {
      const posts = await prisma.campaignChat.count({
        where: { planner: { project: { userId: user.id } } },
      });
      if (posts >= POSTS_THRESHOLD) postsCount++;
    }

    // ── impressions milestone ──────────────────────────────────────────────
    if (!alreadySentImpressions.has(user.id)) {
      const userProjects = await prisma.projects.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      const projectIds = userProjects.map((p) => p.id);
      const result = await prisma.campaignAnalytics.aggregate({
        where: { projectId: { in: projectIds } },
        _sum: { totalImpressions: true },
      });
      const totalImpressions = result._sum.totalImpressions ?? 0;
      if (totalImpressions >= IMPRESSIONS_THRESHOLD) impressionsCount++;
    }

    // ── campaign completion milestone ──────────────────────────────────────
    if (!alreadySentCampaign.has(user.id)) {
      const campaigns = await prisma.campaignPlanner.count({
        where: { project: { userId: user.id }, chats: { some: {} } },
      });
      if (campaigns >= 1) campaignCount++;
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("Milestone candidate analysis");
  console.log("═".repeat(60));
  console.log(`  Posts (10+ posts)              : ${postsCount} users qualify, not yet emailed`);
  console.log(`  Impressions (1,000+ total)     : ${impressionsCount} users qualify, not yet emailed`);
  console.log(`  Campaign (1+ completed)        : ${campaignCount} users qualify, not yet emailed`);
  console.log("═".repeat(60) + "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
