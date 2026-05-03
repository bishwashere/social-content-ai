/**
 * One-time backfill: enable auto-post on qualifying campaigns.
 *
 * A campaign is updated when ALL of the following are true:
 *   1. Its project has at least one social account connected (ProjectToOAuthProvider exists).
 *   2. The campaign does NOT already have autoPostEnabled = true.
 *   3. Most of its posts are generated (≥ GENERATED_THRESHOLD % of chats have status GENERATED).
 *   4. The same project has a previous campaign that had autoPostEnabled = true + a non-empty autoPostTime.
 *
 * The timing (autoPostTime, autoPostPlatforms) is copied from the most-recently-updated
 * auto-post campaign in the same project.
 *
 * Usage:
 *   npx tsx scripts/backfill-autopost-from-previous-campaign.ts
 *
 * Dry-run (preview changes without writing to DB):
 *   DRY_RUN=true npx tsx scripts/backfill-autopost-from-previous-campaign.ts
 *
 * Override the "generated" threshold (default 50%):
 *   GENERATED_THRESHOLD=75 npx tsx scripts/backfill-autopost-from-previous-campaign.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN === "true";
const GENERATED_THRESHOLD = Number(process.env.GENERATED_THRESHOLD ?? 50); // percent

async function main() {
  console.log("=".repeat(60));
  console.log("Backfill: auto-post from previous campaign timing");
  console.log(`DRY_RUN            : ${DRY_RUN}`);
  console.log(`GENERATED_THRESHOLD: ${GENERATED_THRESHOLD}%`);
  console.log("=".repeat(60));

  // ── 1. Projects with at least one social account attached ──────────────────
  const projectsWithSocial = await prisma.projectToOAuthProvider.findMany({
    select: { projectId: true },
    distinct: ["projectId"],
  });

  const eligibleProjectIds = projectsWithSocial.map((r) => r.projectId);
  console.log(`\nProjects with social accounts: ${eligibleProjectIds.length}`);

  if (eligibleProjectIds.length === 0) {
    console.log("No projects with social accounts found. Exiting.");
    return;
  }

  // ── 2. Load all campaigns for those projects (with their chats) ────────────
  const allCampaigns = await prisma.campaignPlanner.findMany({
    where: { projectId: { in: eligibleProjectIds } },
    include: {
      chats: {
        select: { id: true, status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Helper: returns true when a campaign's last day is strictly before today.
  // Past/completed campaigns must never be auto-post enabled by this script.
  function isCampaignPast(c: (typeof allCampaigns)[number]): boolean {
    if (!c.startDate) return false;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const totalDays = (c as any).totalDays ?? c.chats.length;
    if (!totalDays || totalDays === 0) return false;
    const lastDay = new Date(c.startDate);
    lastDay.setUTCDate(lastDay.getUTCDate() + (totalDays - 1));
    lastDay.setUTCHours(0, 0, 0, 0);
    return lastDay < today;
  }

  console.log(`Total campaigns across eligible projects: ${allCampaigns.length}`);

  // ── 3. Group by projectId ──────────────────────────────────────────────────
  const byProject = new Map<string, typeof allCampaigns>();
  for (const c of allCampaigns) {
    const list = byProject.get(c.projectId) ?? [];
    list.push(c);
    byProject.set(c.projectId, list);
  }

  // ── 4. For each project, find the auto-post "reference" campaign ───────────
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const [projectId, campaigns] of byProject) {
    // The reference campaign: most-recently-updated campaign with autoPostEnabled + autoPostTime
    const referenceCampaigns = campaigns.filter(
      (c) => c.autoPostEnabled && c.autoPostTime
    );

    if (referenceCampaigns.length === 0) {
      console.log(`\n[project ${projectId}] No auto-post reference campaign — skip.`);
      totalSkipped += campaigns.filter((c) => !c.autoPostEnabled).length;
      continue;
    }

    // Already sorted desc by updatedAt — first element is the most recent reference
    const ref = referenceCampaigns[0];
    const refTime = ref.autoPostTime!;
    const refPlatforms = ref.autoPostPlatforms ?? [];

    console.log(
      `\n[project ${projectId}] Reference campaign: "${ref.name ?? ref.id}"` +
        ` | time=${refTime} | platforms=[${refPlatforms.join(", ")}]`
    );

    // ── 5. Candidates: autoPostEnabled=false, most posts generated, NOT past ──
    const candidates = campaigns.filter((c) => {
      if (c.autoPostEnabled) return false; // already enabled

      // Never touch campaigns that have already completed their run
      if (isCampaignPast(c)) {
        console.log(`  ⏭ Skip past campaign: "${c.name ?? c.id}"`);
        return false;
      }

      const total = c.chats.length;
      if (total === 0) return false; // no posts at all

      const generated = c.chats.filter((ch) => ch.status === "GENERATED").length;
      const pct = (generated / total) * 100;

      return pct >= GENERATED_THRESHOLD;
    });

    if (candidates.length === 0) {
      console.log(`  → No eligible candidates in this project.`);
      continue;
    }

    for (const c of candidates) {
      const total = c.chats.length;
      const generated = c.chats.filter((ch) => ch.status === "GENERATED").length;
      const pct = Math.round((generated / total) * 100);

      console.log(
        `  ✓ Candidate: "${c.name ?? c.id}" | ${generated}/${total} days generated (${pct}%)`
      );

      if (!DRY_RUN) {
        await prisma.campaignPlanner.update({
          where: { id: c.id },
          data: {
            autoPostEnabled: true,
            autoPostTime: refTime,
            autoPostPlatforms: refPlatforms,
          },
        });
        console.log(`    → Updated (autoPostEnabled=true, time=${refTime})`);
      } else {
        console.log(`    → [DRY_RUN] Would set autoPostEnabled=true, time=${refTime}, platforms=[${refPlatforms.join(", ")}]`);
      }

      totalUpdated++;
    }
  }

  // ── 6. Summary ─────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`Campaigns updated : ${totalUpdated}`);
  console.log(`Campaigns skipped : ${totalSkipped} (no reference timing found in project)`);
  if (DRY_RUN) {
    console.log("DRY_RUN=true — no changes were written to the database.");
  }
  console.log("=".repeat(60));
}

main()
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
