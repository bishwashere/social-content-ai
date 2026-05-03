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

// Campaigns created at least this many days before today are considered "old".
// The backfill script only ever targets already-generated campaigns, which are
// always at least a few weeks old. New campaigns created today won't be touched.
const OLD_CAMPAIGN_THRESHOLD_DAYS = 7;

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

/**
 * Returns true when a campaign should be reverted.
 *
 * Two signals are checked (either is enough):
 *
 *  A) Original startDate is still intact and the last day has already passed.
 *
 *  B) startDate was reset to today by schedule-backfilled-campaigns-this-month.ts
 *     (which overwrites startDate = today on every candidate). We detect this by
 *     checking whether the campaign was created well before today — meaning it is
 *     clearly a pre-existing campaign that shouldn't be rescheduled from scratch.
 */
function shouldRevert(
  startDate: Date | null,
  totalDays: number,
  createdAt: Date
): { revert: boolean; reason: string } {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Signal A: original startDate still present and last day is in the past
  if (isCampaignPast(startDate, totalDays)) {
    return { revert: true, reason: "original startDate is past" };
  }

  // Signal B: startDate == today but campaign was created long before today
  // → schedule script reset startDate; this is an old campaign rescheduled by mistake
  if (startDate) {
    const startUTC = new Date(startDate);
    startUTC.setUTCHours(0, 0, 0, 0);
    const isStartDateToday = startUTC.getTime() === today.getTime();
    const campaignAgeMs = today.getTime() - new Date(createdAt).getTime();
    const campaignAgeDays = campaignAgeMs / (1000 * 60 * 60 * 24);

    if (isStartDateToday && campaignAgeDays >= OLD_CAMPAIGN_THRESHOLD_DAYS) {
      return {
        revert: true,
        reason: `startDate reset to today by schedule script (campaign is ${Math.round(campaignAgeDays)} days old)`,
      };
    }
  }

  return { revert: false, reason: "looks legitimately active" };
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

  // ── 2. Pre-load all non-posted ScheduledPost rows for the project(s) ────────
  //      (Prisma/MongoDB doesn't support JSON path filtering in findMany,
  //       so we fetch all and filter in JS.)
  const allPendingPosts = await prisma.scheduledPost.findMany({
    where: {
      ...(PROJECT_ID !== "ALL" ? { projectId: PROJECT_ID } : {}),
      status: { not: "posted" },
    },
    select: { id: true, date: true, platform: true, meta: true },
  });

  const postsByCampaignId = new Map<string, typeof allPendingPosts>();
  for (const p of allPendingPosts) {
    const cid = (p.meta as any)?.campaignId;
    if (!cid) continue;
    const arr = postsByCampaignId.get(cid) ?? [];
    arr.push(p);
    postsByCampaignId.set(cid, arr);
  }

  let totalReverted = 0;
  let totalPostsDeleted = 0;
  let totalSkipped = 0;

  for (const c of campaigns) {
    const totalDays = (c as any).totalDays ?? c.chats.length;
    const { revert, reason } = shouldRevert(c.startDate, totalDays, c.createdAt);
    const pendingPosts = postsByCampaignId.get(c.id) ?? [];

    if (!revert) {
      console.log(
        `\n  ✓ Keep: "${c.name ?? c.id}"` +
        `  startDate=${c.startDate?.toISOString().split("T")[0] ?? "none"}` +
        `  days=${totalDays}  (${reason})`
      );
      totalSkipped++;
      continue;
    }

    console.log(`\n  ⚠  Revert: "${c.name ?? c.id}"`);
    console.log(`     reason       : ${reason}`);
    console.log(`     startDate    : ${c.startDate?.toISOString().split("T")[0] ?? "none"}  days=${totalDays}`);
    console.log(`     createdAt    : ${c.createdAt.toISOString().split("T")[0]}`);
    console.log(`     pendingPosts : ${pendingPosts.length}`);

    for (const p of pendingPosts) {
      console.log(`     → delete ScheduledPost id=${p.id}  platform=${p.platform}  date=${p.date}`);
    }

    if (!DRY_RUN) {
      if (pendingPosts.length > 0) {
        await prisma.scheduledPost.deleteMany({
          where: { id: { in: pendingPosts.map((p) => p.id) } },
        });
      }
      await prisma.campaignPlanner.update({
        where: { id: c.id },
        data: {
          autoPostEnabled: false,
          autoPostTime: null,
          autoPostPlatforms: [],
          // Restore startDate to null so the campaign no longer looks "active this month"
          startDate: null,
        },
      });
      console.log(`     → Done.`);
    } else {
      console.log(`     → [DRY_RUN] Would revert + delete ${pendingPosts.length} pending posts`);
    }

    totalReverted++;
    totalPostsDeleted += pendingPosts.length;
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`Campaigns reverted        : ${totalReverted}`);
  console.log(`Pending posts deleted     : ${totalPostsDeleted}`);
  console.log(`Campaigns kept (active)   : ${totalSkipped}`);
  if (DRY_RUN) console.log("DRY_RUN=true — no changes written to the database.");
  console.log("=".repeat(60));
}

main()
  .catch((err) => { console.error("Script failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
