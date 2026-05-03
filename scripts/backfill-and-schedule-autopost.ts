/**
 * Backfill auto-post settings AND schedule ScheduledPost rows for qualifying campaigns.
 *
 * A campaign is processed when ALL of the following are true:
 *   1. Its project has at least one social account connected (ProjectToOAuthProvider exists).
 *   2. The campaign does NOT already have autoPostEnabled = true.
 *   3. Most of its posts are generated (≥ GENERATED_THRESHOLD % of chats have status GENERATED).
 *   4. The same project has another campaign that had autoPostEnabled = true + a non-empty autoPostTime
 *      (used as the timing reference).
 *
 * For each qualifying campaign the script will:
 *   - Set autoPostEnabled = true, autoPostTime, autoPostPlatforms (copied from reference campaign).
 *   - Set startDate to today so day-1 maps to today, day-2 to tomorrow, etc.
 *   - Create ScheduledPost rows for every chat day × platform (skips days already in the past).
 *   - Derives timezone from the project's existing scheduled post meta, falls back to UTC.
 *
 * Usage:
 *   npx tsx scripts/backfill-and-schedule-autopost.ts
 *
 * Dry-run (preview — no DB writes):
 *   DRY_RUN=true npx tsx scripts/backfill-and-schedule-autopost.ts
 *
 * Override the "generated" threshold (default 50 %):
 *   GENERATED_THRESHOLD=75 npx tsx scripts/backfill-and-schedule-autopost.ts
 */

import { PrismaClient, OauthPlatform } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "true";
const GENERATED_THRESHOLD = Number(process.env.GENERATED_THRESHOLD ?? 50);

// ── Timezone-aware UTC conversion ─────────────────────────────────────────────
function convertLocalTimeToUTC(
  year: number, month: number, day: number,
  hour: number, minute: number, tz: string
): Date {
  if (tz === "UTC") {
    return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  }
  const referenceUTC = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = formatter.formatToParts(referenceUTC);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || "0");
  const localTime = {
    year: get("year"), month: get("month") - 1, day: get("day"),
    hour: get("hour"), minute: get("minute"),
  };
  const desiredMs = Date.UTC(year, month, day, hour, minute, 0, 0);
  const displayedMs = Date.UTC(localTime.year, localTime.month, localTime.day, localTime.hour, localTime.minute, 0, 0);
  return new Date(referenceUTC.getTime() + (desiredMs - displayedMs));
}

async function main() {
  console.log("=".repeat(60));
  console.log("Backfill + schedule auto-post campaigns");
  console.log(`DRY_RUN            : ${DRY_RUN}`);
  console.log(`GENERATED_THRESHOLD: ${GENERATED_THRESHOLD}%`);
  console.log("=".repeat(60));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

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

  // ── 2. Load all campaigns for those projects (with chats) ──────────────────
  const allCampaigns = await prisma.campaignPlanner.findMany({
    where: { projectId: { in: eligibleProjectIds } },
    include: { chats: { select: { id: true, day: true, status: true, contents: true, media: true } } },
    orderBy: { updatedAt: "desc" },
  });
  console.log(`Total campaigns across eligible projects: ${allCampaigns.length}`);

  // ── 3. Find campaigns that already have ScheduledPost rows (skip those) ─────
  const allScheduledMeta = await prisma.scheduledPost.findMany({
    where: { status: { not: "posted" } },
    select: { meta: true },
  });
  const campaignIdsWithScheduledPosts = new Set(
    allScheduledMeta.map((p) => (p.meta as any)?.campaignId).filter(Boolean)
  );

  // ── 4. Group by project and find timing reference ──────────────────────────
  const byProject = new Map<string, typeof allCampaigns>();
  for (const c of allCampaigns) {
    const list = byProject.get(c.projectId) ?? [];
    list.push(c);
    byProject.set(c.projectId, list);
  }

  // Cache timezone per project (pulled from existing scheduled post meta)
  const timezoneCache = new Map<string, string>();
  async function getTimezoneForProject(projectId: string): Promise<string> {
    if (timezoneCache.has(projectId)) return timezoneCache.get(projectId)!;
    const posts = await prisma.scheduledPost.findMany({
      where: { projectId },
      select: { meta: true },
      take: 20,
    });
    for (const post of posts) {
      const tz = (post.meta as any)?.timezone;
      if (tz && typeof tz === "string") {
        timezoneCache.set(projectId, tz);
        return tz;
      }
    }
    timezoneCache.set(projectId, "UTC");
    return "UTC";
  }

  let totalFlagUpdated = 0;
  let totalScheduled = 0;
  let totalSkippedPast = 0;
  let totalErrors = 0;
  let totalSkippedNoRef = 0;

  // ── 5. Process each project ────────────────────────────────────────────────
  for (const [projectId, campaigns] of byProject) {
    // Reference campaign: most-recently-updated with autoPostEnabled + autoPostTime
    const referenceCampaigns = campaigns.filter((c) => c.autoPostEnabled && c.autoPostTime);

    if (referenceCampaigns.length === 0) {
      const pending = campaigns.filter((c) => !c.autoPostEnabled).length;
      console.log(`\n[project ${projectId}] No auto-post reference campaign — skip (${pending} campaign(s) unchanged).`);
      totalSkippedNoRef += pending;
      continue;
    }

    const ref = referenceCampaigns[0]; // most recent (sorted desc by updatedAt)
    const refTime = ref.autoPostTime!;
    const refPlatforms = ref.autoPostPlatforms ?? [];

    console.log(
      `\n[project ${projectId}] Reference: "${ref.name ?? ref.id}"` +
      ` | time=${refTime} | platforms=[${refPlatforms.join(", ")}]`
    );

    // Candidates: autoPostEnabled=false, enough posts generated, no existing scheduled posts
    const candidates = campaigns.filter((c) => {
      if (c.autoPostEnabled) return false;
      if (campaignIdsWithScheduledPosts.has(c.id)) return false;
      const total = c.chats.length;
      if (total === 0) return false;
      const generated = c.chats.filter((ch) => ch.status === "GENERATED").length;
      return (generated / total) * 100 >= GENERATED_THRESHOLD;
    });

    if (candidates.length === 0) {
      console.log("  → No eligible candidates.");
      continue;
    }

    const timezone = await getTimezoneForProject(projectId);
    const [hours, minutes] = refTime.split(":").map(Number);

    for (const campaign of candidates) {
      const total = campaign.chats.length;
      const generated = campaign.chats.filter((ch) => ch.status === "GENERATED").length;
      const pct = Math.round((generated / total) * 100);

      console.log(
        `\n  ✓ "${campaign.name ?? campaign.id}" | ${generated}/${total} days generated (${pct}%)` +
        ` | timezone: ${timezone}`
      );

      // ── PHASE 1: Update campaign flags ──────────────────────────────────
      if (!DRY_RUN) {
        await prisma.campaignPlanner.update({
          where: { id: campaign.id },
          data: {
            autoPostEnabled: true,
            autoPostTime: refTime,
            autoPostPlatforms: refPlatforms,
            startDate: today,
          },
        });
      } else {
        console.log(
          `    [DRY_RUN] Would set autoPostEnabled=true, time=${refTime}, ` +
          `platforms=[${refPlatforms.join(", ")}], startDate=${today.toISOString().split("T")[0]}`
        );
      }
      totalFlagUpdated++;

      if (refPlatforms.length === 0) {
        console.log("    No platforms on reference — skipping scheduling.");
        continue;
      }

      // ── PHASE 2: Create ScheduledPost rows ──────────────────────────────
      const sortedChats = [...campaign.chats].sort((a, b) => a.day - b.day);

      for (const chat of sortedChats) {
        // day 1 = today, day 2 = tomorrow, etc.
        const targetDate = new Date(Date.UTC(
          today.getUTCFullYear(), today.getUTCMonth(),
          today.getUTCDate() + (chat.day - 1), 0, 0, 0, 0
        ));
        const chatDate = convertLocalTimeToUTC(
          targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(),
          hours, minutes, timezone
        );

        if (chatDate.getTime() < Date.now()) {
          console.log(`    ⏭  Day ${chat.day} (${chatDate.toISOString()}) — in the past, skip`);
          totalSkippedPast++;
          continue;
        }

        const contents = (chat.contents as Record<string, string>) || {};
        const mediaRecord = (chat.media as Record<string, string>) || {};

        for (const platform of refPlatforms) {
          const platformName = platform === "x" ? "twitter" : platform;

          const projectProvider = await prisma.projectToOAuthProvider.findFirst({
            where: {
              projectId,
              oauthProvider: { platform: platformName as OauthPlatform },
            },
            include: { oauthProvider: true },
          });

          if (!projectProvider) {
            console.log(`    ❌ Day ${chat.day} / ${platform}: no OAuth provider — skip`);
            totalErrors++;
            continue;
          }

          const content = contents[platform] || contents[platformName] || "";
          const media = mediaRecord[platform] || undefined;

          if (DRY_RUN) {
            console.log(`    ✓  Day ${chat.day} / ${platform}: ${chatDate.toISOString()} [DRY_RUN]`);
            totalScheduled++;
            continue;
          }

          await prisma.scheduledPost.create({
            data: {
              projectId,
              platform: platformName,
              content,
              date: chatDate.toISOString(),
              status: "pending",
              oauthProviderId: projectProvider.oauthProviderId,
              ...(media ? { media } : {}),
              meta: {
                campaignId: campaign.id,
                campaignName: campaign.name ?? "",
                day: chat.day,
                source: "campaign",
                timezone,
                localTime: refTime,
              },
            },
          });

          console.log(`    ✓  Day ${chat.day} / ${platform}: ${chatDate.toISOString()}`);
          totalScheduled++;
        }
      }
    }
  }

  // ── 6. Summary ─────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`Campaigns flagged (autoPostEnabled=true) : ${totalFlagUpdated}`);
  console.log(`ScheduledPost rows created               : ${totalScheduled}`);
  console.log(`Days skipped (in the past)               : ${totalSkippedPast}`);
  console.log(`Errors (no OAuth mapped)                 : ${totalErrors}`);
  console.log(`Campaigns skipped (no ref timing)        : ${totalSkippedNoRef}`);
  if (DRY_RUN) console.log("\nDRY_RUN=true — no changes were written.");
  console.log("=".repeat(60));
}

main()
  .catch((err) => { console.error("Script failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
