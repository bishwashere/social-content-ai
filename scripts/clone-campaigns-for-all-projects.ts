/**
 * One-time script: for every project that has social accounts connected,
 * clone the most recent campaign and schedule it starting today — unless
 * the project already has pending/future scheduled posts (already active).
 *
 * Timing (autoPostTime, timezone, platforms) is recovered from:
 *   1. The source campaign's own autoPostTime/autoPostPlatforms fields (if still set), OR
 *   2. The most recent ScheduledPost record (any status) for the project
 *      that carries meta.localTime + meta.timezone + platform.
 *
 * Skips a project when:
 *   - No social accounts connected.
 *   - No campaigns exist in the project.
 *   - No timing information can be recovered.
 *   - A pending future ScheduledPost already exists (already scheduled for this month).
 *   - A campaign with the clone name already exists (idempotency).
 *
 * Optional env vars:
 *   DRY_RUN=true           Preview without writing anything.
 *   START_DATE=2026-05-10  Override start date for all clones (YYYY-MM-DD). Defaults to today.
 *
 * Usage:
 *   npx tsx scripts/clone-campaigns-for-all-projects.ts
 *   DRY_RUN=true npx tsx scripts/clone-campaigns-for-all-projects.ts
 */

import { PrismaClient, OauthPlatform } from "@prisma/client";
import { format } from "date-fns";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "true";
const START_DATE_OVERRIDE = process.env.START_DATE;
const PROJECT_IDS_FILTER = process.env.PROJECT_IDS
  ? process.env.PROJECT_IDS.split(",").map((s) => s.trim()).filter(Boolean)
  : null;
// When true, clone the campaign structure even when no autoPostTime is found;
// skip only the ScheduledPost creation step.
const SKIP_SCHEDULING = process.env.SKIP_SCHEDULING === "true";

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
  console.log("Clone campaigns for all eligible projects");
  console.log(`DRY_RUN    : ${DRY_RUN}`);
  console.log("=".repeat(60));

  // ── Start date ───────────────────────────────────────────────────────────────
  let startDate: Date;
  if (START_DATE_OVERRIDE) {
    const [y, m, d] = START_DATE_OVERRIDE.split("-").map(Number);
    startDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  } else {
    startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
  }
  console.log(`Start date : ${startDate.toISOString().split("T")[0]}\n`);

  // ── 1. Projects with social accounts ─────────────────────────────────────────
  const projectRows = await prisma.projectToOAuthProvider.findMany({
    where: PROJECT_IDS_FILTER ? { projectId: { in: PROJECT_IDS_FILTER } } : undefined,
    select: { projectId: true },
    distinct: ["projectId"],
  });
  const projectIds = PROJECT_IDS_FILTER
    ? PROJECT_IDS_FILTER.filter((id) => projectRows.some((r) => r.projectId === id))
    : projectRows.map((r) => r.projectId);
  if (PROJECT_IDS_FILTER) {
    console.log(`Filtering to ${PROJECT_IDS_FILTER.length} specific project(s)`);
  }
  console.log(`Projects with social accounts: ${projectIds.length}`);

  // ── 2. Pre-load: projects that already have pending future scheduled posts ────
  const now = new Date();
  const futurePending = await prisma.scheduledPost.findMany({
    where: {
      projectId: { in: projectIds },
      status: "pending",
      date: { gt: now.toISOString() },
    },
    select: { projectId: true },
    distinct: ["projectId"],
  });
  const projectsAlreadyScheduled = new Set(futurePending.map((p) => p.projectId));
  console.log(`Projects already scheduled (skip): ${projectsAlreadyScheduled.size}`);

  // ── 3. All scheduled posts for timing recovery ────────────────────────────────
  const allScheduledPosts = await prisma.scheduledPost.findMany({
    where: { projectId: { in: projectIds } },
    select: { projectId: true, platform: true, meta: true },
    orderBy: { createdAt: "desc" },
  });

  // Build per-project timing map: { localTime, timezone, platforms[] }
  type Timing = { localTime: string; timezone: string; platforms: string[] };
  const timingByProject = new Map<string, Timing>();
  const platformsByProject = new Map<string, Set<string>>();

  for (const p of allScheduledPosts) {
    const meta = p.meta as any;
    const localTime: string | undefined = meta?.localTime;
    const timezone: string | undefined = meta?.timezone;
    if (localTime && timezone) {
      if (!timingByProject.has(p.projectId)) {
        timingByProject.set(p.projectId, { localTime, timezone, platforms: [] });
      }
    }
    if (!platformsByProject.has(p.projectId)) {
      platformsByProject.set(p.projectId, new Set());
    }
    if (p.platform) platformsByProject.get(p.projectId)!.add(p.platform);
  }

  // Fill platforms into timing
  for (const [pid, timing] of timingByProject) {
    const plats = platformsByProject.get(pid);
    if (plats) timing.platforms = Array.from(plats);
  }

  // ── 4. Most recent campaign per project ───────────────────────────────────────
  const campaigns = await prisma.campaignPlanner.findMany({
    where: { projectId: { in: projectIds } },
    include: { chats: { orderBy: { day: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  const latestCampaignByProject = new Map<string, typeof campaigns[number]>();
  for (const c of campaigns) {
    if (!latestCampaignByProject.has(c.projectId)) {
      latestCampaignByProject.set(c.projectId, c);
    }
  }

  // ── 5. Process each project ───────────────────────────────────────────────────
  let totalCloned = 0;
  let totalScheduled = 0;
  let totalSkipped = 0;

  for (const projectId of projectIds) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`Project: ${projectId}`);

    // Already has future posts?
    if (projectsAlreadyScheduled.has(projectId)) {
      console.log(`  ⏭  Already has pending future posts — skip`);
      totalSkipped++;
      continue;
    }

    // Has a campaign to clone?
    const source = latestCampaignByProject.get(projectId);
    if (!source) {
      console.log(`  ⏭  No campaigns found — skip`);
      totalSkipped++;
      continue;
    }

    // Recover timing: prefer campaign fields, fall back to scheduled post meta
    let autoPostTime: string | null = source.autoPostTime ?? null;
    let autoPostPlatforms: string[] = source.autoPostPlatforms ?? [];
    let timezone = "UTC";

    const recoveredTiming = timingByProject.get(projectId);
    if (!autoPostTime && recoveredTiming?.localTime) {
      autoPostTime = recoveredTiming.localTime;
    }
    if (autoPostPlatforms.length === 0 && recoveredTiming?.platforms.length) {
      autoPostPlatforms = recoveredTiming.platforms;
    }
    if (recoveredTiming?.timezone) {
      timezone = recoveredTiming.timezone;
    }

    // Fall back to campaign.platforms if still no platforms
    if (autoPostPlatforms.length === 0 && source.platforms?.length) {
      autoPostPlatforms = source.platforms;
    }

    if (!autoPostTime) {
      if (SKIP_SCHEDULING) {
        console.log(`  ℹ  No autoPostTime recoverable — will clone without scheduling`);
      } else {
        console.log(`  ⚠  No autoPostTime recoverable — skip`);
        totalSkipped++;
        continue;
      }
    }
    if (autoPostPlatforms.length === 0) {
      if (SKIP_SCHEDULING) {
        console.log(`  ℹ  No platforms recoverable — will clone without scheduling`);
      } else {
        console.log(`  ⚠  No platforms recoverable — skip`);
        totalSkipped++;
        continue;
      }
    }

    // Normalise platform names (x → twitter)
    autoPostPlatforms = autoPostPlatforms.map((p) => (p === "x" ? "twitter" : p));

    const cloneName = `${source.name ?? "Campaign"} ${format(startDate, "MMMM yyyy")}`;
    console.log(`  Source  : "${source.name ?? source.id}" (${source.chats.length} days)`);
    console.log(`  Clone   : "${cloneName}"`);
    console.log(`  Time    : ${autoPostTime} ${timezone}`);
    console.log(`  Platforms: [${autoPostPlatforms.join(", ")}]`);

    // Idempotency check
    const existing = await prisma.campaignPlanner.findFirst({
      where: { projectId, name: cloneName },
      select: { id: true },
    });
    if (existing) {
      console.log(`  ⏭  Campaign "${cloneName}" already exists — skip`);
      totalSkipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY_RUN] Would create "${cloneName}" and schedule ${source.chats.length} days`);
      totalCloned++;
      continue;
    }

    // ── Create clone ────────────────────────────────────────────────────────────
    const clone = await prisma.campaignPlanner.create({
      data: {
        projectId,
        goal: source.goal,
        targetAudience: source.targetAudience,
        name: cloneName,
        startDate,
        platforms: source.platforms,
        autoPostEnabled: true,
        autoPostTime,
        autoPostPlatforms,
        blogNewsMetadata: source.blogNewsMetadata ?? undefined,
        totalDays: source.totalDays ?? source.chats.length,
        repeatNextMonth: source.repeatNextMonth,
        chats: {
          create: source.chats.map((c) => ({
            day: c.day,
            title: c.title ?? "",
            prompt: c.prompt ?? "",
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

    console.log(`  ✓ Campaign created: id=${clone.id}`);
    totalCloned++;

    // ── Schedule posts ──────────────────────────────────────────────────────────
    if (SKIP_SCHEDULING || !autoPostTime || autoPostPlatforms.length === 0) {
      console.log(`  ℹ  Scheduling skipped — configure auto-post in the app`);
      continue;
    }

    const [hours, minutes] = autoPostTime.split(":").map(Number);
    const sortedChats = [...clone.chats].sort((a, b) => a.day - b.day);
    let projectScheduled = 0;

    for (const chat of sortedChats) {
      const targetDate = new Date(Date.UTC(
        startDate.getUTCFullYear(), startDate.getUTCMonth(),
        startDate.getUTCDate() + (chat.day - 1), 0, 0, 0, 0
      ));
      const postDate = convertLocalTimeToUTC(
        targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(),
        hours, minutes, timezone
      );

      if (postDate.getTime() < now.getTime()) {
        console.log(`    ⏭  Day ${chat.day} in the past — skip`);
        continue;
      }

      const contents = (chat.contents as Record<string, string>) || {};
      const mediaRecord = (chat.media as Record<string, string>) || {};

      for (const platform of autoPostPlatforms) {
        const projectProvider = await prisma.projectToOAuthProvider.findFirst({
          where: {
            projectId,
            oauthProvider: { platform: platform as OauthPlatform },
          },
          include: { oauthProvider: true },
        });

        if (!projectProvider) {
          console.log(`    ❌ Day ${chat.day} / ${platform}: no OAuth mapped — skip`);
          continue;
        }

        const content = contents[platform] || contents[platform === "twitter" ? "x" : platform] || "";
        const media = mediaRecord[platform] || undefined;

        await prisma.scheduledPost.create({
          data: {
            projectId,
            platform,
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
              localTime: autoPostTime,
            },
          },
        });

        projectScheduled++;
        totalScheduled++;
      }
    }
    console.log(`  ✓ Scheduled ${projectScheduled} posts`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`Campaigns cloned         : ${totalCloned}`);
  console.log(`ScheduledPost rows created: ${totalScheduled}`);
  console.log(`Projects skipped         : ${totalSkipped}`);
  if (DRY_RUN) console.log("DRY_RUN=true — no changes written.");
  console.log("=".repeat(60));
}

main()
  .catch((err) => { console.error("Script failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
