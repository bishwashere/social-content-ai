/**
 * One-time script: clone the most recent auto-posted campaign for a project
 * and immediately schedule its posts — equivalent to what the monthly-repeat
 * cron does but triggered manually for any project at any time.
 *
 * What it does:
 *   1. Finds the most recently updated campaign in the project that has
 *      autoPostEnabled=true + autoPostTime set (the "source" campaign).
 *   2. Verifies the project has at least one social account connected.
 *   3. Creates a new CampaignPlanner (clone) with:
 *        - startDate = today  (day-1 → today, day-2 → tomorrow, …)
 *        - name     = "<source name> <Month YYYY>"  (e.g. "Oct Plan May 2026")
 *        - same goal / targetAudience / platforms / autoPost* / blogNewsMetadata / totalDays
 *        - chats copied from source (content preserved if already GENERATED,
 *          otherwise PENDING so the cron auto-generates at post time)
 *   4. Schedules ScheduledPost rows for every chat day × platform.
 *   5. Idempotent: skips if a campaign with the generated name already exists.
 *
 * Required env var:
 *   PROJECT_ID=<mongoId>   Target project to clone for.
 *
 * Optional env vars:
 *   DRY_RUN=true           Preview without writing anything.
 *   START_DATE=2026-05-10  Override the start date (YYYY-MM-DD). Defaults to today.
 *
 * Usage:
 *   PROJECT_ID=abc123 npx tsx scripts/clone-and-schedule-campaign.ts
 *   PROJECT_ID=abc123 DRY_RUN=true npx tsx scripts/clone-and-schedule-campaign.ts
 *   PROJECT_ID=abc123 START_DATE=2026-06-01 npx tsx scripts/clone-and-schedule-campaign.ts
 */

import { PrismaClient, OauthPlatform } from "@prisma/client";
import { format } from "date-fns";

const prisma = new PrismaClient();

const PROJECT_ID = process.env.PROJECT_ID;
const DRY_RUN = process.env.DRY_RUN === "true";
const START_DATE_OVERRIDE = process.env.START_DATE;

if (!PROJECT_ID) {
  console.error("❌ PROJECT_ID env var is required.");
  console.error("   Example: PROJECT_ID=abc123 npx tsx scripts/clone-and-schedule-campaign.ts");
  process.exit(1);
}

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
  const local = {
    year: get("year"), month: get("month") - 1, day: get("day"),
    hour: get("hour"), minute: get("minute"),
  };
  const desiredMs = Date.UTC(year, month, day, hour, minute, 0, 0);
  const displayedMs = Date.UTC(local.year, local.month, local.day, local.hour, local.minute, 0, 0);
  return new Date(referenceUTC.getTime() + (desiredMs - displayedMs));
}

async function main() {
  console.log("=".repeat(60));
  console.log("Clone + schedule campaign");
  console.log(`PROJECT_ID : ${PROJECT_ID}`);
  console.log(`DRY_RUN   : ${DRY_RUN}`);
  console.log("=".repeat(60));

  // ── 1. Verify project has social accounts connected ──────────────────────
  const socialCount = await prisma.projectToOAuthProvider.count({
    where: { projectId: PROJECT_ID },
  });
  if (socialCount === 0) {
    console.error("❌ No social accounts connected to this project. Cannot schedule posts.");
    process.exit(1);
  }
  console.log(`\n✓ Social accounts connected: ${socialCount}`);

  // ── 2. Find the source campaign (most recent auto-posted) ────────────────
  const source = await prisma.campaignPlanner.findFirst({
    where: {
      projectId: PROJECT_ID,
      autoPostEnabled: true,
      autoPostTime: { not: null },
      autoPostPlatforms: { isEmpty: false },
    },
    include: {
      chats: { orderBy: { day: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!source) {
    console.error("❌ No auto-post enabled campaign found in this project.");
    process.exit(1);
  }

  console.log(`\nSource campaign : "${source.name ?? source.id}"`);
  console.log(`  goal          : ${source.goal}`);
  console.log(`  days          : ${source.totalDays ?? source.chats.length}`);
  console.log(`  autoPostTime  : ${source.autoPostTime}`);
  console.log(`  platforms     : [${source.autoPostPlatforms.join(", ")}]`);

  // ── 3. Determine start date ───────────────────────────────────────────────
  let startDate: Date;
  if (START_DATE_OVERRIDE) {
    const [y, m, d] = START_DATE_OVERRIDE.split("-").map(Number);
    startDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    console.log(`  startDate     : ${START_DATE_OVERRIDE} (override)`);
  } else {
    startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    console.log(`  startDate     : today (${startDate.toISOString().split("T")[0]})`);
  }

  // ── 4. Build clone name and check idempotency ────────────────────────────
  const cloneName = `${source.name ?? "Campaign"} ${format(startDate, "MMMM yyyy")}`;
  console.log(`\nClone name: "${cloneName}"`);

  const existing = await prisma.campaignPlanner.findFirst({
    where: { projectId: PROJECT_ID!, name: cloneName },
    select: { id: true },
  });
  if (existing) {
    console.log(`\n⚠️  A campaign named "${cloneName}" already exists (id: ${existing.id}).`);
    console.log("   Use START_DATE to target a different month, or rename the existing campaign.");
    process.exit(0);
  }

  // ── 5. Recover timezone from source campaign's existing scheduled posts ───
  let timezone = "UTC";
  if (source.goal === "Blog News") {
    const meta = source.blogNewsMetadata as { timezone?: string } | null;
    timezone = meta?.timezone || "UTC";
  } else {
    const posts = await prisma.scheduledPost.findMany({
      where: { projectId: PROJECT_ID! },
      select: { meta: true },
      take: 20,
    });
    for (const p of posts) {
      const tz = (p.meta as any)?.timezone;
      if (tz && typeof tz === "string") { timezone = tz; break; }
    }
  }
  console.log(`  timezone  : ${timezone}`);

  // ── 6. Preview chat summary ───────────────────────────────────────────────
  const generatedChats = source.chats.filter((c) => c.status === "GENERATED");
  console.log(`\nChats to clone: ${source.chats.length} total, ${generatedChats.length} already generated`);
  console.log("  (Generated content is copied as-is; PENDING chats will be auto-generated by cron at post time)");

  if (DRY_RUN) {
    console.log("\n[DRY_RUN] Would create campaign and schedule posts:");
    const [hours, minutes] = source.autoPostTime!.split(":").map(Number);
    for (const chat of source.chats) {
      const targetDate = new Date(Date.UTC(
        startDate.getUTCFullYear(), startDate.getUTCMonth(),
        startDate.getUTCDate() + (chat.day - 1), 0, 0, 0, 0
      ));
      const postDate = convertLocalTimeToUTC(
        targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(),
        hours, minutes, timezone
      );
      for (const platform of source.autoPostPlatforms) {
        const now = new Date();
        const marker = postDate < now ? "⏭ (past)" : "✓";
        console.log(`  ${marker}  Day ${chat.day} / ${platform}: ${postDate.toISOString()} [${chat.status}]`);
      }
    }
    console.log("\n[DRY_RUN] No changes written.");
    return;
  }

  // ── 7. Create the clone ───────────────────────────────────────────────────
  const clone = await prisma.campaignPlanner.create({
    data: {
      projectId: PROJECT_ID!,
      goal: source.goal,
      targetAudience: source.targetAudience,
      name: cloneName,
      startDate,
      platforms: source.platforms,
      autoPostEnabled: true,
      autoPostTime: source.autoPostTime,
      autoPostPlatforms: source.autoPostPlatforms,
      blogNewsMetadata: source.blogNewsMetadata ?? undefined,
      totalDays: source.totalDays ?? source.chats.length,
      repeatNextMonth: source.repeatNextMonth,
      chats: {
        create: source.chats.map((c) => ({
          day: c.day,
          title: c.title ?? "",
          prompt: c.prompt ?? "",
          // Preserve generated content so posts fire immediately without regeneration
          status: c.status,
          completed: false,
          contents: (c.contents as object) ?? {},
          tickMark: {},
          media: (c.media as object) ?? {},
        })),
      },
    },
    include: { chats: true },
  });

  console.log(`\n✓ Campaign created: "${cloneName}" (id: ${clone.id})`);

  // ── 8. Schedule ScheduledPost rows ───────────────────────────────────────
  const [hours, minutes] = source.autoPostTime!.split(":").map(Number);
  let totalScheduled = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  const sortedChats = [...clone.chats].sort((a, b) => a.day - b.day);

  for (const chat of sortedChats) {
    const targetDate = new Date(Date.UTC(
      startDate.getUTCFullYear(), startDate.getUTCMonth(),
      startDate.getUTCDate() + (chat.day - 1), 0, 0, 0, 0
    ));
    const postDate = convertLocalTimeToUTC(
      targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(),
      hours, minutes, timezone
    );

    const now = new Date();
    if (postDate.getTime() < now.getTime()) {
      console.log(`  ⏭  Day ${chat.day} (${postDate.toISOString()}) — in the past, skip`);
      totalSkipped++;
      continue;
    }

    const contents = (chat.contents as Record<string, string>) || {};
    const mediaRecord = (chat.media as Record<string, string>) || {};

    for (const platform of source.autoPostPlatforms) {
      const platformName = platform === "x" ? "twitter" : platform;

      const projectProvider = await prisma.projectToOAuthProvider.findFirst({
        where: {
          projectId: PROJECT_ID!,
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

      await prisma.scheduledPost.create({
        data: {
          projectId: PROJECT_ID!,
          platform: platformName,
          content,
          date: postDate.toISOString(),
          status: "pending",
          oauthProviderId: projectProvider.oauthProviderId,
          ...(media ? { media } : {}),
          meta: {
            campaignId: clone.id,
            campaignName: cloneName,
            day: chat.day,
            source: "campaign",
            timezone,
            localTime: source.autoPostTime,
          },
        },
      });

      console.log(`  ✓  Day ${chat.day} / ${platform}: ${postDate.toISOString()}`);
      totalScheduled++;
    }
  }

  // ── 9. Summary ────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`Campaign cloned          : "${cloneName}"`);
  console.log(`ScheduledPost rows       : ${totalScheduled}`);
  console.log(`Days skipped (past)      : ${totalSkipped}`);
  console.log(`Errors (no OAuth mapped) : ${totalErrors}`);
  console.log("=".repeat(60));
}

main()
  .catch((err) => { console.error("Script failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
