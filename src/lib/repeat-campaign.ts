import { prisma } from "@/lib/prisma";
import { format, addMonths, startOfMonth } from "date-fns";

/**
 * Called by the /api/post cron on every tick.
 * For any campaign whose last day is today and has repeatNextMonth enabled,
 * creates a fresh clone starting on the first day of next month.
 * Idempotent: no-ops if the clone already exists.
 */
export async function repeatEndedCampaigns(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

    const lastDay = new Date(campaign.startDate);
    lastDay.setDate(lastDay.getDate() + (campaign.totalDays - 1));
    lastDay.setHours(0, 0, 0, 0);

    if (lastDay.getTime() !== today.getTime()) continue;

    const nextMonthStart = startOfMonth(addMonths(today, 1));
    const newName = `${campaign.name || "Campaign"} ${format(nextMonthStart, "MMMM yyyy")}`;

    const existing = await prisma.campaignPlanner.findFirst({
      where: { projectId: campaign.projectId, name: newName },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.campaignPlanner.create({
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
  }
}
