"use server";

import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

/**
 * Calculate analytics for a specific campaign
 * Analyzes all scheduled posts + platform posts for that campaign
 */
export async function calculateCampaignAnalytics(campaignId: string) {
  const campaign = await prisma.campaignPlanner.findUnique({
    where: { id: campaignId },
    include: { chats: true },
  });

  if (!campaign) throw new Error("Campaign not found");

  // Get all scheduled posts for this campaign
  const allScheduledPosts = await prisma.scheduledPost.findMany({
    where: {
      projectId: campaign.projectId,
      status: "success",
    },
  });

  // Filter posts that belong to this campaign (using meta.campaignId)
  const scheduledPosts = allScheduledPosts.filter((post) => {
    const meta = post.meta as { campaignId?: string } | null;
    return meta?.campaignId === campaignId;
  });

  console.log(`[Analytics] Found ${scheduledPosts.length} scheduled posts for campaign ${campaignId}`);

  // Get corresponding platform posts (actual published data)
  const oauthProviderIds = scheduledPosts
    .map((p) => p.oauthProviderId)
    .filter(Boolean) as string[];

  const platformPosts = await prisma.platformPost.findMany({
    where: {
      oauthProviderId: {
        in: oauthProviderIds,
      },
    },
    include: { oauthProvider: true },
  });

  console.log(`[Analytics] Found ${platformPosts.length} platform posts for campaign ${campaignId}`);

  // Calculate metrics
  const metrics = {
    totalPosts: platformPosts.length,
    totalLikes: platformPosts.reduce((sum, p) => sum + (p.likes || 0), 0),
    totalComments: platformPosts.reduce((sum, p) => sum + (p.comments || 0), 0),
    totalShares: platformPosts.reduce((sum, p) => sum + (p.shares || 0), 0),
    totalImpressions: platformPosts.reduce((sum, p) => sum + (p.impressions || 0), 0),
    avgEngagementRate: 0,
  };

  // Calculate engagement rate
  metrics.avgEngagementRate =
    metrics.totalImpressions > 0
      ? ((metrics.totalLikes + metrics.totalComments + metrics.totalShares) /
          metrics.totalImpressions) *
        100
      : 0;

  // Find best posting time
  const bestPostingHour = findBestPostingHour(platformPosts);
  const bestDayOfWeek = findBestDayOfWeek(platformPosts);
  const bestPlatform = findBestPlatform(platformPosts);

  // Platform breakdown
  const platformMetrics = calculatePlatformBreakdown(platformPosts);

  // Content patterns (basic for now)
  const contentPatterns = {
    analyzed: platformPosts.length > 0,
    totalAnalyzed: platformPosts.length,
    message: platformPosts.length > 0 
      ? "Basic metrics calculated" 
      : "Not enough data yet",
  };

  // Save to database
  const periodEnd = new Date();
  const periodStart = campaign.startDate || subDays(periodEnd, 30);

  const analytics = await prisma.campaignAnalytics.create({
    data: {
      campaignId: campaign.id,
      projectId: campaign.projectId,
      periodStart,
      periodEnd,
      ...metrics,
      bestPostingHour,
      bestDayOfWeek,
      bestPlatform,
      platformMetrics,
      contentPatterns,
    },
  });

  console.log(`[Analytics] Saved analytics for campaign ${campaignId}`);

  return analytics;
}

/**
 * Find which hour gets best engagement
 */
function findBestPostingHour(posts: any[]): number | null {
  if (posts.length === 0) return null;

  const hourlyEngagement = new Map<number, { total: number; count: number }>();

  posts.forEach((post) => {
    const hour = new Date(post.date).getHours();
    const engagement =
      (post.likes + post.comments + post.shares) / Math.max(post.impressions || 1, 1);

    if (!hourlyEngagement.has(hour)) {
      hourlyEngagement.set(hour, { total: 0, count: 0 });
    }

    const stats = hourlyEngagement.get(hour)!;
    stats.total += engagement;
    stats.count += 1;
  });

  // Find hour with highest average engagement
  let bestHour = 0;
  let bestAvg = 0;

  hourlyEngagement.forEach((stats, hour) => {
    const avg = stats.total / stats.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestHour = hour;
    }
  });

  return bestHour;
}

/**
 * Find which day of week gets best engagement
 */
function findBestDayOfWeek(posts: any[]): number | null {
  if (posts.length === 0) return null;

  const dailyEngagement = new Map<number, { total: number; count: number }>();

  posts.forEach((post) => {
    const dayOfWeek = new Date(post.date).getDay(); // 0 = Sunday, 6 = Saturday
    const engagement =
      (post.likes + post.comments + post.shares) / Math.max(post.impressions || 1, 1);

    if (!dailyEngagement.has(dayOfWeek)) {
      dailyEngagement.set(dayOfWeek, { total: 0, count: 0 });
    }

    const stats = dailyEngagement.get(dayOfWeek)!;
    stats.total += engagement;
    stats.count += 1;
  });

  let bestDay = 0;
  let bestAvg = 0;

  dailyEngagement.forEach((stats, day) => {
    const avg = stats.total / stats.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestDay = day;
    }
  });

  return bestDay;
}

/**
 * Find which platform performs best
 */
function findBestPlatform(posts: any[]): string | null {
  if (posts.length === 0) return null;

  const platformEngagement = new Map<string, { total: number; count: number }>();

  posts.forEach((post) => {
    const platform = post.oauthProvider?.platform;
    if (!platform) return;

    const engagement =
      (post.likes + post.comments + post.shares) / Math.max(post.impressions || 1, 1);

    if (!platformEngagement.has(platform)) {
      platformEngagement.set(platform, { total: 0, count: 0 });
    }

    const stats = platformEngagement.get(platform)!;
    stats.total += engagement;
    stats.count += 1;
  });

  let bestPlatform = "";
  let bestAvg = 0;

  platformEngagement.forEach((stats, platform) => {
    const avg = stats.total / stats.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestPlatform = platform;
    }
  });

  return bestPlatform || null;
}

/**
 * Calculate metrics breakdown by platform
 */
function calculatePlatformBreakdown(posts: any[]) {
  const breakdown: Record<string, any> = {};

  posts.forEach((post) => {
    const platform = post.oauthProvider?.platform;
    if (!platform) return;

    if (!breakdown[platform]) {
      breakdown[platform] = {
        posts: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        impressions: 0,
      };
    }

    breakdown[platform].posts += 1;
    breakdown[platform].likes += post.likes || 0;
    breakdown[platform].comments += post.comments || 0;
    breakdown[platform].shares += post.shares || 0;
    breakdown[platform].impressions += post.impressions || 0;
  });

  // Calculate engagement rate for each platform
  Object.keys(breakdown).forEach((platform) => {
    const data = breakdown[platform];
    data.engagementRate =
      data.impressions > 0
        ? ((data.likes + data.comments + data.shares) / data.impressions) * 100
        : 0;
  });

  return breakdown;
}

/**
 * Calculate project-level analytics and generate campaign suggestions
 */
export async function calculateProjectAnalytics(projectId: string) {
  const project = await prisma.projects.findUnique({
    where: { id: projectId },
    include: {
      campaignPlanners: {
        include: { chats: true },
      },
    },
  });

  if (!project) throw new Error("Project not found");

  // Get all platform posts for this project (last 30 days)
  const thirtyDaysAgo = subDays(new Date(), 30);
  
  const projectOAuthProviders = await prisma.projectToOAuthProvider.findMany({
    where: { projectId },
    select: { oauthProviderId: true },
  });

  const oauthProviderIds = projectOAuthProviders.map((p) => p.oauthProviderId);

  const platformPosts = await prisma.platformPost.findMany({
    where: {
      oauthProviderId: {
        in: oauthProviderIds,
      },
      date: {
        gte: thirtyDaysAgo,
      },
    },
    include: { oauthProvider: true },
  });

  console.log(`[Project Analytics] Found ${platformPosts.length} platform posts for project ${projectId}`);

  // Calculate overall metrics
  const totalPosts = platformPosts.length;
  const totalCampaigns = project.campaignPlanners.length;
  const totalImpressions = platformPosts.reduce((sum, p) => sum + (p.impressions || 0), 0);
  const totalEngagement = platformPosts.reduce(
    (sum, p) => sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0),
    0
  );
  const avgEngagementRate =
    totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

  // Find recommendations
  const recommendedTime = findBestPostingHour(platformPosts);
  const recommendedPlatforms = findTopPlatforms(platformPosts, 3);
  
  // Content suggestions
  const contentSuggestions = {
    bestPostingHour: recommendedTime,
    topPlatforms: recommendedPlatforms,
    avgEngagementRate: avgEngagementRate.toFixed(2),
  };

  // Engagement trend (simple: compare first half vs second half of period)
  const midpoint = new Date(thirtyDaysAgo.getTime() + (Date.now() - thirtyDaysAgo.getTime()) / 2);
  const firstHalfPosts = platformPosts.filter((p) => new Date(p.date) < midpoint);
  const secondHalfPosts = platformPosts.filter((p) => new Date(p.date) >= midpoint);

  const firstHalfEngagement = calculateAvgEngagement(firstHalfPosts);
  const secondHalfEngagement = calculateAvgEngagement(secondHalfPosts);

  let engagementTrend = "stable";
  if (secondHalfEngagement > firstHalfEngagement * 1.1) {
    engagementTrend = "improving";
  } else if (secondHalfEngagement < firstHalfEngagement * 0.9) {
    engagementTrend = "declining";
  }

  // Generate AI campaign suggestions (placeholder for now)
  const campaignSuggestions = await generateCampaignSuggestions(project, {
    bestTime: recommendedTime,
    topPlatforms: recommendedPlatforms,
    engagementTrend,
  });

  // Save to database
  const analytics = await prisma.projectAnalytics.create({
    data: {
      projectId: project.id,
      periodStart: thirtyDaysAgo,
      periodEnd: new Date(),
      totalPosts,
      totalCampaigns,
      avgEngagementRate,
      recommendedTime: recommendedTime !== null ? `${recommendedTime}:00` : null,
      recommendedPlatforms,
      contentSuggestions,
      engagementTrend,
      campaignSuggestions,
    },
  });

  console.log(`[Project Analytics] Saved analytics for project ${projectId}`);

  return analytics;
}

function findTopPlatforms(posts: any[], topN: number): string[] {
  const platformEngagement = new Map<string, { total: number; count: number }>();

  posts.forEach((post) => {
    const platform = post.oauthProvider?.platform;
    if (!platform) return;

    const engagement =
      (post.likes + post.comments + post.shares) / Math.max(post.impressions || 1, 1);

    if (!platformEngagement.has(platform)) {
      platformEngagement.set(platform, { total: 0, count: 0 });
    }

    const stats = platformEngagement.get(platform)!;
    stats.total += engagement;
    stats.count += 1;
  });

  // Sort by average engagement
  const sorted = Array.from(platformEngagement.entries())
    .map(([platform, stats]) => ({
      platform,
      avgEngagement: stats.total / stats.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  return sorted.slice(0, topN).map((p) => p.platform);
}

function calculateAvgEngagement(posts: any[]): number {
  if (posts.length === 0) return 0;

  const totalImpressions = posts.reduce((sum, p) => sum + (p.impressions || 0), 0);
  const totalEngagement = posts.reduce(
    (sum, p) => sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0),
    0
  );

  return totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
}

/**
 * Generate AI campaign suggestions based on analytics
 */
async function generateCampaignSuggestions(
  project: any,
  insights: { bestTime: number | null; topPlatforms: string[]; engagementTrend: string }
) {
  // Import GoogleGenerativeAI
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash-001" });

  const promptText = `Based on the following project and performance data, suggest 3 NEW creative campaign ideas:

Project Name: ${project.name}
Project Description: ${project.description}

Performance Insights:
- Best posting time: ${insights.bestTime !== null ? `${insights.bestTime}:00` : "Not enough data"}
- Top performing platforms: ${insights.topPlatforms.length > 0 ? insights.topPlatforms.join(", ") : "Not enough data"}
- Engagement trend: ${insights.engagementTrend}
- Previous campaigns: ${project.campaignPlanners.length}

Please suggest 3 new campaign ideas that:
1. Are different from what's been done before
2. Leverage the best performing platforms and times
3. Are creative and engaging
4. Have clear goals and target audiences

Format as JSON array with structure:
[
  {
    "name": "Campaign Name",
    "goal": "Clear goal statement",
    "targetAudience": "Who this campaign targets",
    "why": "Why this will work based on data",
    "suggestedPlatforms": ["platform1", "platform2"],
    "suggestedTime": "14:00",
    "duration": "X weeks",
    "contentIdeas": ["Idea 1", "Idea 2", "Idea 3"]
  }
]`;

  try {
    const result = await model.generateContent(promptText);
    const response = result.response.text();
    
    // Try to parse JSON from response
    let suggestions = [];
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      suggestions = JSON.parse(jsonText);
    } catch (e) {
      console.error("[Campaign Suggestions] Failed to parse AI response as JSON:", e);
      // Fallback suggestions
      suggestions = [
        {
          name: "Engagement Boost Campaign",
          goal: "Increase audience interaction and build community",
          targetAudience: project.description || "Your target audience",
          why: `Based on your ${insights.engagementTrend} engagement trend, focus on interactive content`,
          suggestedPlatforms: insights.topPlatforms.length > 0 ? insights.topPlatforms : ["twitter", "linkedin"],
          suggestedTime: insights.bestTime !== null ? `${insights.bestTime}:00` : "14:00",
          duration: "2 weeks",
          contentIdeas: [
            "Ask thought-provoking questions",
            "Share behind-the-scenes content",
            "Run polls and surveys",
          ],
        },
      ];
    }

    return suggestions;
  } catch (error) {
    console.error("[Campaign Suggestions] Error generating suggestions:", error);
    return [];
  }
}
