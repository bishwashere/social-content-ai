/**
 * One-time script: schedule ScheduledPost rows for campaigns backfilled with auto-post.
 *
 * Targets the same 13 campaigns that were marked autoPostEnabled by
 * backfill-autopost-from-previous-campaign.ts (projects with social connected,
 * autoPostEnabled=true, most posts generated, but no existing ScheduledPost rows).
 *
 * For each qualifying campaign:
 *   1. Sets startDate to today (day-1 maps to today, day-2 to tomorrow, etc.)
 *   2. Creates ScheduledPost rows for every chat day × autoPostPlatform
 *      using the autoPostTime stored on the campaign.
 *   3. Derives timezone from the reference campaign's existing scheduled posts
 *      (falls back to UTC if none found).
 *
 * Usage:
 *   npx tsx scripts/schedule-backfilled-campaigns-this-month.ts
 *
 * Dry-run:
 *   DRY_RUN=true npx tsx scripts/schedule-backfilled-campaigns-this-month.ts
 */

import { PrismaClient, OauthPlatform } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "true";

// ── Timezone-aware UTC conversion (mirrors campaign-scheduling.ts) ──────────
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
  const localTime = { year: get("year"), month: get("month") - 1, day: get("day"), hour: get("hour"), minute: get("minute") };
  const desiredMs = Date.UTC(year, month, day, hour, minute, 0, 0);
  const displayedMs = Date.UTC(localTime.year, localTime.month, localTime.day, localTime.hour, localTime.minute, 0, 0);
  return new Date(referenceUTC.getTime() + (desiredMs - displayedMs));
}

async function main() {
  console.log("=".repeat(60));
  console.log("Schedule backfilled campaigns — this month (May 2026)");
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log("=".repeat(60));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // ── 1. Same eligibility filter as the backfill script ───────────────────
  const projectsWithSocial = await prisma.projectToOAuthProvider.findMany({
    select: { projectId: true },
    distinct: ["projectId"],
  });
  const eligibleProjectIds = projectsWithSocial.map((r) => r.projectId);

  const allCampaigns = await prisma.campaignPlanner.findMany({
    where: {
      projectId: { in: eligibleProjectIds },
      autoPostEnabled: true,
      autoPostTime: { not: null },
    },
    include: { chats: true },
    orderBy: { updatedAt: "desc" },
  });

  // Only process campaigns that have NO existing pending ScheduledPost rows
  // (to avoid double-scheduling campaigns that were already set up via UI)
  const allScheduledMeta = await prisma.scheduledPost.findMany({
    where: { status: { not: "posted" } },
    select: { meta: true },
  });
  const campaignIdsWithScheduledPosts = new Set(
    allScheduledMeta
      .map((p) => (p.meta as any)?.campaignId)
      .filter(Boolean)
  );

  const candidates = allCampaigns.filter((c) => {
    // Skip if already has scheduled posts
    if (campaignIdsWithScheduledPosts.has(c.id)) return false;
    // Must have generated posts
    const total = c.chats.length;
    if (total === 0) return false;
    const generated = c.chats.filter((ch) => ch.status === "GENERATED").length;
    return (generated / total) * 100 >= 50;
  });

  console.log(`\nCampaigns to schedule: ${candidates.length}`);

  // ── 2. For each project, find timezone from the reference campaign's posts ─
  const timezoneCache = new Map<string, string>(); // projectId → timezone

  async function getTimezoneForProject(projectId: string): Promise<string> {
    if (timezoneCache.has(projectId)) return timezoneCache.get(projectId)!;

    // Look at existing scheduled posts for this project and pick first timezone found
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

  let totalScheduled = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // ── 3. Process each candidate campaign ────────────────────────────────────
  for (const campaign of candidates) {
    const autoPostTime = campaign.autoPostTime!;
    const platforms = campaign.autoPostPlatforms ?? [];

    if (platforms.length === 0) {
      console.log(`\n[${campaign.name ?? campaign.id}] No platforms set — skip.`);
      continue;
    }

    const timezone = await getTimezoneForProject(campaign.projectId);
    const [hours, minutes] = autoPostTime.split(":").map(Number);

    console.log(`\n[${campaign.name ?? campaign.id}]`);
    console.log(`  projectId : ${campaign.projectId}`);
    console.log(`  days      : ${campaign.chats.length} (${campaign.chats.filter(c => c.status === "GENERATED").length} generated)`);
    console.log(`  time      : ${autoPostTime} | timezone: ${timezone}`);
    console.log(`  platforms : [${platforms.join(", ")}]`);
    console.log(`  startDate → today (${today.toISOString().split("T")[0]})`);

    // ── 3a. Update startDate to today ───────────────────────────────────────
    if (!DRY_RUN) {
      await prisma.campaignPlanner.update({
        where: { id: campaign.id },
        data: { startDate: today },
      });
    }

    const sortedChats = [...campaign.chats].sort((a, b) => a.day - b.day);

    for (const chat of sortedChats) {
      // day 1 = today, day 2 = today+1, etc.
      const targetDate = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() + (chat.day - 1),
        0, 0, 0, 0
      ));

      const chatDate = convertLocalTimeToUTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        hours, minutes, timezone
      );

      // Skip if still in the past (e.g. today's time already passed)
      const now = new Date();
      if (chatDate.getTime() < now.getTime()) {
        console.log(`  ⏭  Day ${chat.day} (${chatDate.toISOString()}) — in the past, skip`);
        totalSkipped++;
        continue;
      }

      const contents = (chat.contents as Record<string, string>) || {};
      const mediaRecord = (chat.media as Record<string, string>) || {};

      for (const platform of platforms) {
        const platformName = platform === "x" ? "twitter" : platform;

        // Verify OAuth provider is mapped for this project + platform
        const projectProvider = await prisma.projectToOAuthProvider.findFirst({
          where: {
            projectId: campaign.projectId,
            oauthProvider: { platform: platformName as OauthPlatform },
          },
          include: { oauthProvider: true },
        });

        if (!projectProvider) {
          console.log(`  ❌ Day ${chat.day} / ${platform}: no OAuth provider mapped — skip`);
          totalErrors++;
          continue;
        }

        const content = contents[platform] || contents[platformName] || "";
        const media = mediaRecord[platform] || undefined;

        if (DRY_RUN) {
          console.log(`  ✓  Day ${chat.day} / ${platform}: ${chatDate.toISOString()} [DRY_RUN]`);
          totalScheduled++;
          continue;
        }

        await prisma.scheduledPost.create({
          data: {
            projectId: campaign.projectId,
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
              localTime: autoPostTime,
            },
          },
        });

        console.log(`  ✓  Day ${chat.day} / ${platform}: ${chatDate.toISOString()}`);
        totalScheduled++;
      }
    }
  }

  // ── 4. Summary ─────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`ScheduledPost rows created : ${totalScheduled}`);
  console.log(`Days skipped (past)        : ${totalSkipped}`);
  console.log(`Errors (no OAuth mapped)   : ${totalErrors}`);
  if (DRY_RUN) console.log("DRY_RUN=true — no changes written.");
  console.log("=".repeat(60));
}

main()
  .catch((err) => { console.error("Script failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
