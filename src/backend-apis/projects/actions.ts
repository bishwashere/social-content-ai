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
  calculateConsistency,
  calculateSuccessRate,
  calculatePlatformDiversity,
  type PlatformPostWithProvider,
} from "./analytics";
import { startOfDay, subDays } from "date-fns";

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

  // Skip cached ProjectPulse data and always recalculate to ensure accuracy
  // The cached data may have been calculated with old logic
  // TODO: Update cron job to recalculate with new logic, then we can re-enable cache
  // const projectPulse = await prisma.projectPulse.findFirst({
  //   where: {
  //     projectId,
  //   },
  //   orderBy: {
  //     createdAt: "desc", // newest
  //   },
  // });

  // if (projectPulse) {
  //   return {
  //     pulse: Math.round(projectPulse.pulse),
  //     components: projectPulse.components as {
  //       cadence: number;
  //       onTime: number;
  //       engagement: number;
  //       coverage: number;
  //       planProgress: number;
  //     },
  //     thiwWeekPostSummaries: projectPulse.thisWeekPostSummaries as {
  //       posts: number;
  //       noPosts: number;
  //       likes: number;
  //       impressions: number;
  //       uniqueImpressions: number;
  //       er: number;
  //     },
  //     daysPosted: projectPulse.daysPosted,
  //     gapDays: projectPulse.gapDays
  //   };;
  // }

  // For streak calculation, we need posts from the last 30 days (rolling, not calendar month)
  // This ensures we capture posts across month boundaries (e.g., October 31 posts when viewing in November)
  const thirtyDaysAgo = startOfDay(subDays(todayStart, 30));
  // For engagement trend analysis, we need previous period (days 8-14 ago)
  const fourteenDaysAgo = startOfDay(subDays(todayStart, 14));

  const [planners, scheduledPosts, oauthProvidersLast7Days, oauthProvidersPrevious7Days, oauthProvidersFullMonth, projectTracking] =
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
      // Last 7 days for engagement/coverage calculations
      prisma.projectToOAuthProvider.findMany({
        where: {
          projectId,
        },
        select: {
          oauthProvider: {
            select: {
              id: true,
              platform: true,
              pagePosts: {
                where: {
                  date: {
                    gte: sevenDaysAgo,
                    lt: todayStart
                  }
                },
                include: {
                  oauthProvider: {
                    select: {
                      platform: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      // Previous 7 days (days 8-14 ago) for engagement trend analysis
      prisma.projectToOAuthProvider.findMany({
        where: {
          projectId,
        },
        select: {
          oauthProvider: {
            select: {
              id: true,
              platform: true,
              pagePosts: {
                where: {
                  date: {
                    gte: fourteenDaysAgo,
                    lt: sevenDaysAgo
                  }
                },
                include: {
                  oauthProvider: {
                    select: {
                      platform: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      // Last 30 days for streak calculation (rolling window, not calendar month)
      prisma.projectToOAuthProvider.findMany({
        where: {
          projectId,
        },
        select: {
          oauthProvider: {
            select: {
              id: true,
              platform: true,
              pagePosts: {
                where: {
                  date: {
                    gte: thirtyDaysAgo,
                    lt: todayStart
                  }
                },
                include: {
                  oauthProvider: {
                    select: {
                      platform: true,
                    },
                  },
                },
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

  // Platform posts for last 7 days (engagement, coverage, this week summaries)
  // Map posts with their provider's platform for easier access
  const platformPostsLast7Days: PlatformPostWithProvider[] = oauthProvidersLast7Days.flatMap(
    (projectProvider) => {
      const provider = projectProvider.oauthProvider;
      if (!provider) return [];
      return (provider.pagePosts || []).map(post => ({
        ...post,
        // Ensure oauthProvider relation is set with platform from parent provider
        oauthProvider: (post.oauthProvider || {
          platform: provider.platform,
        }) as { platform: typeof provider.platform },
      }));
    }
  );

  // Platform posts for previous 7 days (engagement trend analysis)
  const platformPostsPrevious7Days: PlatformPostWithProvider[] = oauthProvidersPrevious7Days.flatMap(
    (projectProvider) => {
      const provider = projectProvider.oauthProvider;
      if (!provider) return [];
      return (provider.pagePosts || []).map(post => ({
        ...post,
        // Ensure oauthProvider relation is set with platform from parent provider
        oauthProvider: (post.oauthProvider || {
          platform: provider.platform,
        }) as { platform: typeof provider.platform },
      }));
    }
  );

  // Platform posts for full month (streak calculation)
  const platformPostsFullMonth: PlatformPostWithProvider[] = oauthProvidersFullMonth.flatMap(
    (projectProvider) => {
      const provider = projectProvider.oauthProvider;
      if (!provider) return [];
      return (provider.pagePosts || []).map(post => ({
        ...post,
        // Ensure oauthProvider relation is set with platform from parent provider
        oauthProvider: (post.oauthProvider || {
          platform: provider.platform,
        }) as { platform: typeof provider.platform },
      }));
    }
  );

  // Count total connected platforms for diversity calculation
  const totalConnectedPlatforms = oauthProvidersLast7Days.length;

  // Debug: Log posts fetched for streak calculation
  console.log(`🔍 Posts for streak (Project ${projectId}):`, {
    totalPosts: platformPostsFullMonth.length,
    dateRange: { from: thirtyDaysAgo.toISOString(), to: todayStart.toISOString() },
    postsByDate: platformPostsFullMonth
      .map(p => ({ date: new Date(p.date).toDateString(), platform: p.oauthProvider?.platform }))
      .slice(0, 20), // First 20 for debugging
  });

  // Calculate all components (based purely on platform data, no manual/campaign data)
  const cadence = calculateCadence(platformPostsLast7Days, platformPostsPrevious7Days);
  const onTime = calculateOnTime(scheduledPosts);
  const engagement = calculateEngagement(platformPostsLast7Days, platformPostsPrevious7Days);
  const coverage = calculateCoverage(platformPostsLast7Days, totalConnectedPlatforms);
  // planProgress removed - was based on campaigns, not platform data
  
  // Calculate new components
  const streak = calculateGapsandPostsDaysThisMonth(platformPostsFullMonth, "1MONTH");
  const consistency = calculateConsistency(streak.daysPosted);
  const successRate = calculateSuccessRate(scheduledPosts);
  const platformDiversity = calculatePlatformDiversity(platformPostsLast7Days, totalConnectedPlatforms);

  // Enhanced weighted formula - all based on actual platform data
  const pulse =
    0.25 * cadence +           // Posting frequency consistency (platform data only)
    0.20 * onTime +            // Scheduled post timing accuracy
    0.20 * engagement +        // Engagement with trend analysis (platform data)
    0.15 * consistency +       // Posting streak (platform data)
    0.10 * successRate +       // Scheduled post success rate
    0.05 * coverage +          // Platform usage coverage (platform data)
    0.05 * platformDiversity;  // Multi-platform usage (platform data)

  // console.log("postsThisWeek", scheduledPosts);

  const thiwWeekPostSummaries = calculateThisWeekPostSummaries(
    projectTracking,
    platformPostsLast7Days
  );

  // Debug logging to help troubleshoot metrics
  console.log(`📊 Project ${projectId} Enhanced Pulse Calculation (Platform Data Only):`, {
    cadence,
    onTime,
    engagement,
    consistency,
    successRate,
    coverage,
    platformDiversity,
    pulse: Math.round(pulse),
    streak: streak.daysPosted,
    gapDays: streak.gapDays,
    postsLast7Days: platformPostsLast7Days.length,
    postsPrevious7Days: platformPostsPrevious7Days.length,
    postsFullMonth: platformPostsFullMonth.length,
    totalConnectedPlatforms,
    scheduledPostsCount: scheduledPosts.length,
  });

  return {
    pulse: Math.round(pulse),
    components: {
      cadence,
      onTime,
      engagement,
      consistency,
      successRate,
      coverage,
      platformDiversity,
      planProgress: 0, // Removed from calculation, kept for backward compatibility
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