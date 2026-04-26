import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import {
  scheduleCampaignPosts,
  scheduleCampaignTasks,
} from "@/backend-apis/campaign-planner/campaign-scheduling";

/**
 * Called by the /api/post cron on every tick.
 * For any campaign whose last day is today and has repeatNextMonth enabled,
 * creates a fresh clone starting on the first day of next month,
 * then schedules all posts/tasks so auto-posting works immediately.
 * Idempotent: no-ops if the clone already exists.
 */
export async function repeatEndedCampaigns(): Promise<void> {
  // Use UTC so the "today" boundary is consistent regardless of host timezone.
  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );

  const candidates = await prisma.campaignPlanner.findMany({
    where: {
      repeatNextMonth: true,
      startDate: { not: null },
      totalDays: { not: null },
    },
    include: {
      chats: {
        orderBy: { day: "asc" },
        select: { day: true, title: true, prompt: true },
      },
    },
  });

  for (const campaign of candidates) {
    if (!campaign.startDate || !campaign.totalDays) continue;

    // Compute the last day of the source campaign in UTC.
    const startUTC = new Date(campaign.startDate);
    const lastDayUTC = new Date(
      Date.UTC(
        startUTC.getUTCFullYear(),
        startUTC.getUTCMonth(),
        startUTC.getUTCDate() + (campaign.totalDays - 1),
        0, 0, 0, 0
      )
    );

    if (lastDayUTC.getTime() !== todayUTC.getTime()) continue;

    // First day of next calendar month, anchored in UTC.
    const nextMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
    );
    const newName = `${campaign.name || "Campaign"} ${format(nextMonthStart, "MMMM yyyy")}`;

    const existing = await prisma.campaignPlanner.findFirst({
      where: { projectId: campaign.projectId, name: newName },
      select: { id: true },
    });
    if (existing) continue;

    const clone = await prisma.campaignPlanner.create({
      data: {
        projectId: campaign.projectId,
        goal: campaign.goal,
        targetAudience: campaign.targetAudience,
        name: newName,
        startDate: nextMonthStart,
        platforms: campaign.platforms,
        autoPostEnabled: campaign.autoPostEnabled,
        autoPostTime: campaign.autoPostTime ?? null,
        autoPostPlatforms: campaign.autoPostPlatforms,
        blogNewsMetadata: campaign.blogNewsMetadata ?? undefined,
        totalDays: campaign.totalDays,
        repeatNextMonth: true,
        chats: {
          create: campaign.chats.map((c) => ({
            day: c.day,
            title: c.title ?? "",
            prompt: c.prompt ?? "",
            status: "PENDING" as const,
            completed: false,
            contents: {},
            tickMark: {},
            media: {},
          })),
        },
      },
    });

    console.log(`[repeat-campaign] Created "${newName}" for project ${campaign.projectId}`);

    // Auto-schedule posts when the source campaign had auto-posting enabled.
    if (
      campaign.autoPostEnabled &&
      campaign.autoPostTime &&
      campaign.autoPostPlatforms.length > 0
    ) {
      // Recover the timezone:
      //   - Blog News campaigns store it inside blogNewsMetadata.timezone.
      //   - All other campaigns: look up the most recent ScheduledPost of the
      //     source campaign and read meta.timezone, falling back to UTC.
      let timezone = "UTC";

      if (campaign.goal === "Blog News") {
        const meta = campaign.blogNewsMetadata as { timezone?: string } | null;
        timezone = meta?.timezone || "UTC";
      } else {
        const lastScheduled = await prisma.scheduledPost.findFirst({
          where: {
            meta: { path: ["campaignId"], equals: campaign.id },
          },
          orderBy: { createdAt: "desc" },
          select: { meta: true },
        });
        const metaRecord = lastScheduled?.meta as { timezone?: string } | null;
        timezone = metaRecord?.timezone || "UTC";
      }

      const scheduleArgs = {
        campaignId: clone.id,
        projectId: campaign.projectId,
        autoPostTime: campaign.autoPostTime,
        timezone,
        platforms: campaign.autoPostPlatforms,
      };

      let result;
      if (campaign.goal === "Blog News") {
        result = await scheduleCampaignTasks(scheduleArgs);
      } else {
        result = await scheduleCampaignPosts(scheduleArgs);
      }

      if (result.scheduledCount > 0) {
        console.log(
          `[repeat-campaign] Scheduled ${result.scheduledCount} post(s) for "${newName}" (tz: ${timezone})`
        );
      }
      if (result.errors.length > 0) {
        console.warn(
          `[repeat-campaign] Scheduling errors for "${newName}":`,
          result.errors
        );
      }
    }
  }
}
