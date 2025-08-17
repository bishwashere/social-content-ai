"use server";
import { AI } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import * as cheerio from "cheerio";
import { calculateCadence, calculateCoverage, calculateEngagement, calculateGapsandPostsDaysThisMonth, calculateOnTime, calculatePlanProgress, calculateThisWeekPostSummaries } from "./analytics";
import { endOfWeek, startOfWeek, subWeeks } from "date-fns";

export async function getWebsiteDescription(url: string) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Try to get meta description first
    // let description =
    //   $('meta[name="description"]').attr("content") ||
    //   $('meta[property="og:description"]').attr("content");

    // console.log("description from meta tags:", description);

    // // If no description, get all body text
    // if (!description) {
    let description = $("body").text();
    // Optional: trim and collapse whitespace
    description = description.replace(/\s+/g, " ").trim();

    // console.log("description from body text:", description);
    // }

    // summarize this description using gemini in 3 lines

    const ai = new AI();
    description = (await ai.summarize(description, 3)) || "";

    console.log("summarized description:", description);

    return description;
  } catch {
    return null;
  }
}


export async function getProjectPulse(projectId: string) {

  const [planners, scheduledPosts, oauthProviders] = await Promise.all([
    prisma.campaignPlanner.findMany({
      where: { projectId },
      include: { chats: true },
    }),
    prisma.scheduledPost.findMany({
      where: { projectId },
    }),
    prisma.projectToOAuthProvider.findMany({
      where: {
        projectId,
      },
      select: {
        oauthProvider: {
          select: {
            pagePosts: true,
          }
        }
      }
    }),
  ]);

  const platformPosts = oauthProviders.flatMap(provider => provider.oauthProvider?.pagePosts ?? []);

  // Filter posts for last 4 weeks
  const fourWeeksAgo = subWeeks(new Date(), 4);
  const postsLast4Weeks = platformPosts.filter(
    post => post.date >= fourWeeksAgo
  );

  // Filter posts for this week
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const postsThisWeek = platformPosts.filter(
    post => post.date >= thisWeekStart && post.date <= thisWeekEnd
  );

  const cadence = calculateCadence(planners);
  const onTime = calculateOnTime(scheduledPosts);
  const coverage = calculateCoverage(planners);
  const planProgress = calculatePlanProgress(planners);
  const engagement = calculateEngagement(postsLast4Weeks);

  // Weighted formula
  const pulse =
    0.35 * cadence +
    0.25 * onTime +
    0.2 * engagement +
    0.1 * coverage +
    0.1 * planProgress;

  const thiwWeekPostSummaries = calculateThisWeekPostSummaries(planners, postsThisWeek);

  const streak = calculateGapsandPostsDaysThisMonth(planners, '1MONTH');

  return {
    pulse: Math.round(pulse),
    components: {
      cadence,
      onTime,
      engagement,
      coverage,
      planProgress,
    },
    thiwWeekPostSummaries,
    ...streak
  };
}