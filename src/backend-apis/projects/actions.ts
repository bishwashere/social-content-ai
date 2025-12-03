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
    console.log(`[getWebsiteDescription] Starting fetch for URL: ${url}`);
    
    const { data } = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log(`[getWebsiteDescription] Successfully fetched HTML, length: ${data.length} characters`);
    
    // Wait a bit for any initial JavaScript to potentially execute (though this won't help with SPAs)
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`[getWebsiteDescription] Waited 2 seconds for potential JS execution`);
    
    const $ = cheerio.load(data);
    console.log(`[getWebsiteDescription] HTML parsed successfully`);

    // Try to get meta description first
    const metaDescription = $('meta[name="description"]').attr("content");
    const ogDescription = $('meta[property="og:description"]').attr("content");
    const twitterDescription = $('meta[property="twitter:description"]').attr("content");
    const ogTitle = $('meta[property="og:title"]').attr("content");
    
    console.log(`[getWebsiteDescription] Meta tags found:`, {
      metaDescription: metaDescription || "not found",
      ogDescription: ogDescription || "not found",
      twitterDescription: twitterDescription || "not found",
      ogTitle: ogTitle || "not found"
    });
    
    let description =
      metaDescription ||
      ogDescription ||
      twitterDescription ||
      ogTitle;

    console.log(`[getWebsiteDescription] Selected meta description:`, description || "none");

    // If no meta description, try to get content from other sources
    if (!description || description.trim().length < 20) {
      console.log(`[getWebsiteDescription] Meta description insufficient, trying title tag...`);
      
      // Try title tag first
      const title = $("title").text();
      console.log(`[getWebsiteDescription] Title tag found:`, title || "not found");
      
      if (title && title.trim().length > 10) {
        description = title;
        console.log(`[getWebsiteDescription] Using title as description:`, description);
      } else {
        console.log(`[getWebsiteDescription] Title insufficient, trying body text and other sources...`);
        
        // Try to get h1, h2 tags first (often have key content even in SPAs)
        const h1 = $("h1").first().text().trim();
        const h2 = $("h2").first().text().trim();
        console.log(`[getWebsiteDescription] Heading tags found:`, { h1: h1 || "not found", h2: h2 || "not found" });
        
        if (h1 && h1.length > 10) {
          description = h1;
          console.log(`[getWebsiteDescription] Using h1 as description:`, description);
        } else if (h2 && h2.length > 10) {
          description = h2;
          console.log(`[getWebsiteDescription] Using h2 as description:`, description);
        } else {
          // Remove script, style, and other non-content elements before extracting
          $("script, style, noscript, iframe, embed, object").remove();
          let bodyText = $("body").text();
          // Optional: trim and collapse whitespace
          bodyText = bodyText.replace(/\s+/g, " ").trim();

          console.log(`[getWebsiteDescription] Body text extracted, length: ${bodyText.length} characters`);
          console.log(`[getWebsiteDescription] Body text preview:`, bodyText.substring(0, 200) + (bodyText.length > 200 ? "..." : ""));

          // Use body text if it has any meaningful content (at least 20 chars)
          if (bodyText && bodyText.length > 20) {
            description = bodyText;
            console.log(`[getWebsiteDescription] Using body text as description (${bodyText.length} chars)`);
          } else {
            console.log(`[getWebsiteDescription] Body text too short (${bodyText.length} chars), cannot use`);
          }
        }
      }
    }

    // Only summarize if we have meaningful content
    if (description && description.trim().length > 20) {
      console.log(`[getWebsiteDescription] Content found (${description.length} chars), sending to AI for summarization...`);
      console.log(`[getWebsiteDescription] Content preview:`, description.substring(0, 500));
      
      const ai = new AI();
      const summarized = await ai.summarize(`Give a description about this product:\n\n${description}`, 3);
      
      if (summarized && summarized.trim().length > 0) {
        description = summarized;
        console.log(`[getWebsiteDescription] ✅ AI summarization successful:`, description);
      } else {
        console.log(`[getWebsiteDescription] ⚠️ AI summarization returned empty, using original description`);
      }
    } else {
      // If no meaningful content found, return null so user can enter manually
      console.log(`[getWebsiteDescription] ❌ No meaningful content found (description length: ${description?.length || 0})`);
      console.log(`[getWebsiteDescription] Available content sources:`, {
        hasMetaDescription: !!metaDescription,
        hasOgDescription: !!ogDescription,
        hasTwitterDescription: !!twitterDescription,
        hasTitle: !!$("title").text(),
        bodyTextLength: $("body").text().replace(/\s+/g, " ").trim().length
      });
      return null;
    }

    console.log(`[getWebsiteDescription] Final description:`, description);
    return description;
  } catch (error) {
    console.error(`[getWebsiteDescription] Error fetching description for ${url}:`, error);
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

  const [_planners, scheduledPosts, oauthProvidersLast7Days, oauthProvidersPrevious7Days, oauthProvidersFullMonth, projectTracking] =
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