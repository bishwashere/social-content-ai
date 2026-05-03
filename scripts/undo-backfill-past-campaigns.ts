/**
 * One-time fix: undo autoPostEnabled=true that was incorrectly set on
 * already-completed (past) campaigns by backfill-autopost-from-previous-campaign.ts.
 *
 * A campaign is "past" when it has a startDate AND its last scheduled day
 * is strictly before today (same definition used by isPastCampaign in the UI).
 *
 * For each affected campaign the script:
 *   1. Resets autoPostEnabled=false, autoPostTime=null, autoPostPlatforms=[]
 *   2. Deletes any pending ScheduledPost rows that reference the campaign
 *      (rows the schedule-backfilled-campaigns-this-month script may have created)
 *
 * Required env var:
 *   PROJECT_ID=<mongoId>   Scope to one project (use "ALL" to check every project).
 *
 * Optional env vars:
 *   DRY_RUN=true           Preview without writing anything.
 *
 * Usage:
 *   PROJECT_ID=687f77380cca4abd2dd40aca npx tsx scripts/undo-backfill-past-campaigns.ts
 *   PROJECT_ID=687f77380cca4abd2dd40aca DRY_RUN=true npx tsx scripts/undo-backfill-past-campaigns.ts
 *   PROJECT_ID=ALL DRY_RUN=true npx tsx scripts/undo-backfill-past-campaigns.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROJECT_ID = process.env.PROJECT_ID;
const DRY_RUN = process.env.DRY_RUN === "true";

if (!PROJECT_ID) {
  console.error("❌  PROJECT_ID env var is required.");
  console.error("    Example: PROJECT_ID=687f77380cca4abd2dd40aca npx tsx scripts/undo-backfill-past-campaigns.ts");
  process.exit(1);
}

function isCampaignPast(startDate: Date | null, totalDays: number): boolean {
  if (!startDate) return false;
  if (totalDays === 0) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lastDay = new Date(startDate);
  lastDay.setUTCDate(lastDay.getUTCDate() + (totalDays - 1));
  lastDay.setUTCHours(0, 0, 0, 0);
  return lastDay < today;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Undo backfill: revert autoPostEnabled on past campaigns");
  console.log(`PROJECT_ID : ${PROJECT_ID}`);
  console.log(`DRY_RUN   : ${DRY_RUN}`);
  console.log("=".repeat(60));

  // ── 1. Load campaigns to inspect ────────────────────────────────────────────
  const campaigns = await prisma.campaignPlanner.findMany({
    where: {
      ...(PROJECT_ID !== "ALL" ? { projectId: PROJECT_ID } : {}),
      autoPostEnabled: true,
    },
    include: {
      chats: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`\nCampaigns with autoPostEnabled=true: ${campaigns.length}`);

  let totalReverted = 0;
  let totalPostsDeleted = 0;
  let totalSkipped = 0;

  for (const c of campaigns) {
    const totalDays = (c as any).totalDays ?? c.chats.length;
    const past = isCampaignPast(c.startDate, totalDays);

    if (!past) {
      console.log(`\n  ✓ Active (keep): "${c.name ?? c.id}"  startDate=${c.startDate?.toISOString().split("T")[0] ?? "none"}  days=${totalDays}`);
      totalSkipped++;
      continue;
    }

    // Campaign is past — find any pending scheduled posts referencing it
    const pendingPosts = await prisma.scheduledPost.findMany({
      where: {
        projectId: c.projectId,
        status: { not: "posted" },
        meta: { path: ["campaignId"], equals: c.id },
      },
      select: { id: true, date: true, platform: true },
    });

    console.log(`\n  ⚠  Past campaign: "${c.name ?? c.id}"`);
    console.log(`     startDate=${c.startDate?.toISOString().split("T")[0] ?? "none"}  days=${totalDays}`);
    console.log(`     pendingScheduledPosts=${pendingPosts.length}`);

    if (pendingPosts.length > 0) {
      for (const p of pendingPosts) {
        console.log(`     → delete ScheduledPost id=${p.id}  platform=${p.platform}  date=${p.date}`);
      }
    }

    if (!DRY_RUN) {
      // Remove pending scheduled posts
      if (pendingPosts.length > 0) {
        await prisma.scheduledPost.deleteMany({
          where: { id: { in: pendingPosts.map((p) => p.id) } },
        });
      }

      // Revert the campaign
      await prisma.campaignPlanner.update({
        where: { id: c.id },
        data: {
          autoPostEnabled: false,
          autoPostTime: null,
          autoPostPlatforms: [],
        },
      });

      console.log(`     → Reverted autoPostEnabled=false`);
    } else {
      console.log(`     → [DRY_RUN] Would revert autoPostEnabled + delete ${pendingPosts.length} pending posts`);
    }

    totalReverted++;
    totalPostsDeleted += pendingPosts.length;
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`Past campaigns reverted   : ${totalReverted}`);
  console.log(`Pending posts deleted     : ${totalPostsDeleted}`);
  console.log(`Active campaigns (kept)   : ${totalSkipped}`);
  if (DRY_RUN) console.log("DRY_RUN=true — no changes written to the database.");
  console.log("=".repeat(60));
}

main()
  .catch((err) => { console.error("Script failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
