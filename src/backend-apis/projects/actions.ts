"use server";
import { AI } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import * as cheerio from "cheerio";
import {
  calculateCadence,
  calculateCoverage,
  calculateEngagement,
  calculateGapsandPostsDaysThisMonth,
  calculateOnTime,
  calculatePlanProgress,
  calculateThisWeekPostSummaries,
} from "./analytics";
import { startOfDay, subDays, subWeeks } from "date-fns";

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
  console.log("Getting project pulse for:", projectId);
  const todayStart = startOfDay(new Date()); // today 00:00
  const sevenDaysAgo = startOfDay(subDays(todayStart, 7)); // 7 days before today 00:00

  // Fetch latest puse data calculated by cron if available
  const projectPulse = await prisma.projectPulse.findFirst({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "desc", // newest
    },
  });

  if (projectPulse) {
    return {
      pulse: Math.round(projectPulse.pulse),
      components: projectPulse.components as {
        cadence: number;
        onTime: number;
        engagement: number;
        coverage: number;
        planProgress: number;
      },
      thiwWeekPostSummaries: projectPulse.thisWeekPostSummaries as {
        posts: number;
        noPosts: number;
        likes: number;
        impressions: number;
        uniqueImpressions: number;
        er: number;
      },
      daysPosted: projectPulse.daysPosted,
      gapDays: projectPulse.gapDays
    };;
  }

  const [planners, scheduledPosts, oauthProviders, projectTracking] =
    await Promise.all([
      prisma.campaignPlanner.findMany({
        where: { projectId },
        include: { chats: true },
      }),
      prisma.scheduledPost.findMany({
        where: {
          projectId,
          date: {
            gte: sevenDaysAgo,
            lt: todayStart
          }
        },
      }),
      prisma.projectToOAuthProvider.findMany({
        where: {
          projectId,
        },
        select: {
          oauthProvider: {
            select: {
              pagePosts: {
                where: {
                  date: {
                    gte: sevenDaysAgo,
                    lt: todayStart
                  }
                }
              },
            },
          },
        },
      }),
      prisma.projectTracking.findMany({
        where: {
          projectId,
          date: {
            gte: sevenDaysAgo,
            lt: todayStart
          }
        },
      }),
    ]);

  const platformPosts = oauthProviders.flatMap(
    (provider) => provider.oauthProvider?.pagePosts ?? []
  );

  const cadence = calculateCadence(planners);
  const onTime = calculateOnTime(scheduledPosts);
  const coverage = calculateCoverage(planners);
  const planProgress = calculatePlanProgress(planners);
  const engagement = calculateEngagement(platformPosts);

  // Weighted formula
  const pulse =
    0.35 * cadence +
    0.25 * onTime +
    0.2 * engagement +
    0.1 * coverage +
    0.1 * planProgress;

  // console.log("postsThisWeek", scheduledPosts);

  const thiwWeekPostSummaries = calculateThisWeekPostSummaries(
    projectTracking,
    platformPosts
  );

  const streak = calculateGapsandPostsDaysThisMonth(planners, "1MONTH");

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
    ...streak,
  };
}

export const getAllDayProjectPulse = async (projectId: string) => {
  try {
    const projectPulse = await prisma.projectPulse.findMany({
      where: {
        projectId: projectId
      },
      orderBy: {
        createdAt: "asc"
      }
    })
    return projectPulse;
  }
  catch (e) {
    throw e;
  }
}