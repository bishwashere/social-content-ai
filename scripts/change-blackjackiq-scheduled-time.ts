/**
 * One-off: Change all scheduled post times for "Blackjackiq Pro - Basic Strategy Trainer"
 * from 9:00 PM to 10:30 AM.
 *
 * - Updates campaign autoPostTime to "10:30"
 * - Updates each ScheduledPost date to same calendar day at 10:30 AM (project timezone from meta)
 *
 * Run: npx tsx scripts/change-blackjackiq-scheduled-time.ts
 */

import { prisma } from "../src/lib/prisma";

const PROJECT_NAME = "Blackjackiq Pro - Basic Strategy Trainer";
const NEW_TIME = "10:30"; // 10:30 AM

// Convert local time in IANA timezone to UTC (same logic as campaign-scheduling.ts)
function convertLocalTimeToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string
): Date {
  if (tz === "UTC") {
    return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  }

  const referenceUTC = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(referenceUTC);
  const localTime = {
    year: parseInt(parts.find((p) => p.type === "year")?.value || "0"),
    month: parseInt(parts.find((p) => p.type === "month")?.value || "0") - 1,
    day: parseInt(parts.find((p) => p.type === "day")?.value || "0"),
    hour: parseInt(parts.find((p) => p.type === "hour")?.value || "0"),
    minute: parseInt(parts.find((p) => p.type === "minute")?.value || "0"),
  };

  const desiredMs = Date.UTC(year, month, day, hour, minute, 0, 0);
  const displayedMs = Date.UTC(
    localTime.year,
    localTime.month,
    localTime.day,
    localTime.hour,
    localTime.minute,
    0,
    0
  );
  const timezoneOffsetMs = desiredMs - displayedMs;
  return new Date(referenceUTC.getTime() + timezoneOffsetMs);
}

// Get local (year, month, day) from a UTC date in a given timezone
function getLocalDateParts(utcDate: Date, tz: string): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  return {
    year: parseInt(parts.find((p) => p.type === "year")?.value || "0"),
    month: parseInt(parts.find((p) => p.type === "month")?.value || "0") - 1,
    day: parseInt(parts.find((p) => p.type === "day")?.value || "0"),
  };
}

async function main() {
  const project = await prisma.projects.findFirst({
    where: { name: PROJECT_NAME.trim() },
    select: { id: true, name: true },
  });

  if (!project) {
    console.error(`Project "${PROJECT_NAME}" not found.`);
    process.exit(1);
  }

  console.log(`Found project: ${project.name} (${project.id})\n`);

  // 1. Update all campaigns for this project: autoPostTime = "10:30"
  const campaigns = await prisma.campaignPlanner.findMany({
    where: { projectId: project.id },
    select: { id: true, name: true, autoPostTime: true },
  });

  for (const c of campaigns) {
    await prisma.campaignPlanner.update({
      where: { id: c.id },
      data: { autoPostTime: NEW_TIME },
    });
    console.log(`  Campaign "${c.name || c.id}": autoPostTime ${c.autoPostTime ?? "null"} → ${NEW_TIME}`);
  }
  console.log(`Updated ${campaigns.length} campaign(s) to autoPostTime ${NEW_TIME}\n`);

  // 2. Update all scheduled posts: same calendar day at 10:30 AM in project timezone
  const posts = await prisma.scheduledPost.findMany({
    where: { projectId: project.id },
    select: { id: true, date: true, platform: true, status: true, meta: true },
  });

  const timezoneDefault = "America/Los_Angeles"; // fallback if meta has no timezone

  for (const post of posts) {
    const meta = (post.meta ?? {}) as { timezone?: string; localTime?: string };
    const tz = meta.timezone || timezoneDefault;
    const currentDate = new Date(post.date);
    const { year, month, day } = getLocalDateParts(currentDate, tz);
    const newDate = convertLocalTimeToUTC(year, month, day, 10, 30, tz);

    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        date: newDate,
        meta: { ...meta, localTime: NEW_TIME, timezone: tz },
      },
    });

    console.log(
      `  Post ${post.id} (${post.platform}, ${post.status}): ${currentDate.toISOString()} → ${newDate.toISOString()} (${tz})`
    );
  }

  console.log(`\nDone. Updated ${posts.length} scheduled post(s) to 10:30 AM.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
