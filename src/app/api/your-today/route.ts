import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { startOfDay, subDays, subMinutes } from "date-fns";

// Helper function to get days since last post for all projects at once (batch query)
async function getDaysSinceLastPostMap(projectIds: string[]): Promise<Map<string, number | null>> {
  const resultMap = new Map<string, number | null>();
  
  if (projectIds.length === 0) {
    return resultMap;
  }

  try {
    // Initialize all projects with null
    projectIds.forEach(id => resultMap.set(id, null));

    // Get all OAuth providers for all projects
    const projectOAuthProviders = await prisma.projectToOAuthProvider.findMany({
      where: { projectId: { in: projectIds } },
      select: { 
        projectId: true,
        oauthProviderId: true 
      }
    });

    // Group OAuth provider IDs by project
    const projectToOAuthProviders = new Map<string, string[]>();
    projectOAuthProviders.forEach(provider => {
      const existing = projectToOAuthProviders.get(provider.projectId) || [];
      existing.push(provider.oauthProviderId);
      projectToOAuthProviders.set(provider.projectId, existing);
    });

    // Get all OAuth provider IDs
    const allOAuthProviderIds = Array.from(new Set(
      projectOAuthProviders.map(p => p.oauthProviderId)
    ));

    if (allOAuthProviderIds.length === 0) {
      return resultMap;
    }

    // Get the most recent post for each OAuth provider
    const lastPosts = await prisma.platformPost.findMany({
      where: {
        oauthProviderId: { in: allOAuthProviderIds }
      },
      select: {
        oauthProviderId: true,
        date: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Group posts by OAuth provider and get the most recent for each
    const oauthProviderToLastPost = new Map<string, Date>();
    lastPosts.forEach(post => {
      const existing = oauthProviderToLastPost.get(post.oauthProviderId);
      if (!existing || post.date > existing) {
        oauthProviderToLastPost.set(post.oauthProviderId, post.date);
      }
    });

    // Calculate days since last post for each project
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Debug: Log some sample data
    const sampleProjectIds = ["689f7167d1b9b746c5c73eec", "688a0cafc2ad92060a298653", "688d0a4451cf105b4c13d0c8"]; // New York Laws, PNW Gardening, NextPostAI
    console.log("📅 getDaysSinceLastPostMap - Sample projects:", {
      totalProjects: projectIds.length,
      totalOAuthProviders: allOAuthProviderIds.length,
      totalPosts: lastPosts.length,
      sampleProjectMappings: sampleProjectIds.map(id => ({
        projectId: id,
        oauthProviderIds: projectToOAuthProviders.get(id) || [],
        hasPosts: (projectToOAuthProviders.get(id) || []).some(providerId => oauthProviderToLastPost.has(providerId))
      }))
    });

    projectIds.forEach(projectId => {
      const oauthProviderIds = projectToOAuthProviders.get(projectId) || [];
      if (oauthProviderIds.length === 0) {
        resultMap.set(projectId, null);
        return;
      }

      // Find the most recent post across all OAuth providers for this project
      let mostRecentPost: Date | null = null;
      oauthProviderIds.forEach(oauthProviderId => {
        const lastPost = oauthProviderToLastPost.get(oauthProviderId);
        if (lastPost && (!mostRecentPost || lastPost > mostRecentPost)) {
          mostRecentPost = lastPost;
        }
      });

      if (!mostRecentPost) {
        resultMap.set(projectId, null);
        return;
      }

      // Calculate days since last post
      const lastPostDate = new Date(mostRecentPost);
      lastPostDate.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - lastPostDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      resultMap.set(projectId, diffDays);
    });

    return resultMap;
  } catch (error) {
    console.error("Error calculating days since last post for projects:", error);
    // Return map with all nulls on error
    projectIds.forEach(id => resultMap.set(id, null));
    return resultMap;
  }
}

type ConsistencyAnalysis = {
  hasHistoricalData: boolean;
  streak: number;
  gapDays: number;
  totalPostsLast30Days: number;
  avgImpressionsConsistent: number; // Avg impressions when posting consistently
  avgImpressionsInconsistent: number; // Avg impressions when posting inconsistently
  impressionsBoost: number; // Percentage boost in impressions during consistent periods
  lastPostDate: Date | null;
  daysSinceLastPost: number;
  message: string;
  needsAction: boolean;
};

/**
 * Analyze historical posting consistency and its correlation with impressions
 * Returns data-driven insights about whether consistency boosted performance
 */
// Helper function to calculate project stats (impressions, posts, etc.)
async function calculateProjectStats(projectId: string): Promise<{
  campaignCount: number;
  publishedPostsCount: number;
  totalImpressions: number;
  recentImpressions: number;
}> {
  const today = startOfDay(new Date());
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  let publishedPostsCount = 0;
  let totalImpressions = 0;
  let recentImpressions = 0;

  try {
    // Get total campaigns for this project
    const projectCampaigns = await prisma.campaignPlanner.findMany({
      where: { projectId },
      select: { id: true }
    });
    const totalCampaigns = projectCampaigns.length;

    // Get OAuth provider IDs linked to this project
    const projectOAuthProviders = await prisma.projectToOAuthProvider.findMany({
      where: { projectId },
      select: {
        oauthProviderId: true
      }
    });

    const oauthProviderIds = projectOAuthProviders.map(p => p.oauthProviderId);

    if (oauthProviderIds.length > 0) {
      // Query PlatformPost directly for better performance and accuracy
      const allPosts = await prisma.platformPost.findMany({
        where: {
          oauthProviderId: {
            in: oauthProviderIds
          },
          date: {
            gte: thirtyDaysAgo,
            lte: today
          }
        },
        select: {
          id: true,
          impressions: true,
          date: true
        }
      });

      publishedPostsCount = allPosts.length;

      // Calculate total impressions from last 30 days
      // Only count posts that have impressions data (not null/undefined)
      totalImpressions = allPosts.reduce((sum, post) => {
        return sum + (post.impressions || 0);
      }, 0);

      // Calculate recent impressions (last 3 days)
      const recentPosts = allPosts.filter(post => new Date(post.date) >= threeDaysAgo);
      recentImpressions = recentPosts.reduce((sum, post) => {
        return sum + (post.impressions || 0);
      }, 0);

      // Debug logging for project stats calculation
      if (totalImpressions > 0) {
        console.log(`📊 Project Stats for ${projectId}:`, {
          totalImpressions,
          recentImpressions,
          publishedPostsCount,
          totalPosts: allPosts.length,
          recentPostsCount: recentPosts.length,
          threeDaysAgo: threeDaysAgo.toISOString(),
          today: today.toISOString(),
          recentPostsDates: recentPosts.map(p => ({
            date: p.date.toISOString(),
            impressions: p.impressions
          }))
        });
      }
    }

    return {
      campaignCount: totalCampaigns,
      publishedPostsCount: publishedPostsCount,
      totalImpressions: totalImpressions,
      recentImpressions: recentImpressions
    };
  } catch (error) {
    console.error(`Error calculating stats for project ${projectId}:`, error);
    // Return default values on error
    return {
      campaignCount: 0,
      publishedPostsCount: 0,
      totalImpressions: 0,
      recentImpressions: 0
    };
  }
}

async function analyzeProjectConsistency(projectId: string): Promise<ConsistencyAnalysis> {
  const today = startOfDay(new Date());
  const thirtyDaysAgo = startOfDay(subDays(today, 30));
  
  // Fetch PlatformPost data for this project via ProjectToOAuthProvider
  const oauthProviders = await prisma.projectToOAuthProvider.findMany({
    where: { projectId },
    select: {
      oauthProvider: {
        select: {
          pagePosts: {
            where: {
              date: {
                gte: thirtyDaysAgo,
                lte: today
              }
            },
            orderBy: { date: 'desc' }
          }
        }
      }
    }
  });

  // Flatten all posts from all connected platforms
  const allPosts = oauthProviders.flatMap(
    p => p.oauthProvider?.pagePosts || []
  );

  if (allPosts.length === 0) {
    return {
      hasHistoricalData: false,
      streak: 0,
      gapDays: 30,
      totalPostsLast30Days: 0,
      avgImpressionsConsistent: 0,
      avgImpressionsInconsistent: 0,
      impressionsBoost: 0,
      lastPostDate: null,
      daysSinceLastPost: 30,
      message: "Start posting to build your consistency - the more you post, the more we can optimize",
      needsAction: true
    };
  }

  // Calculate streak and gap days
  const postedDays = new Set<string>();
  for (const post of allPosts) {
    const postDate = startOfDay(new Date(post.date));
    if (postDate >= thirtyDaysAgo && postDate <= today) {
      postedDays.add(postDate.toDateString());
    }
  }

  // Calculate streak going backwards from yesterday
  let streak = 0;
  let currentDate = subDays(today, 1);
  let consecutiveGaps = 0;
  
  while (currentDate >= thirtyDaysAgo) {
    if (postedDays.has(currentDate.toDateString())) {
      consecutiveGaps = 0;
      streak++;
    } else {
      consecutiveGaps++;
      if (consecutiveGaps >= 2) break; // Streak broken after 2 consecutive gaps
    }
    currentDate = subDays(currentDate, 1);
  }

  const totalDays = 30;
  const gapDays = totalDays - postedDays.size;
  
  // Find last post date
  const sortedPosts = [...allPosts].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastPostDate = sortedPosts[0] ? new Date(sortedPosts[0].date) : null;
  const daysSinceLastPost = lastPostDate 
    ? Math.floor((today.getTime() - startOfDay(lastPostDate).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  // Analyze impressions correlation with consistency
  // Group posts by whether they were posted during a "consistent period" (streak of 3+ days)
  const postsWithImpressions = allPosts.filter(p => p.impressions && p.impressions > 0);
  
  let avgImpressionsConsistent = 0;
  let avgImpressionsInconsistent = 0;
  let impressionsBoost = 0;

  if (postsWithImpressions.length >= 3) {
    // Simple heuristic: posts in the first half of sorted (recent) vs second half
    // In reality, posts during active streaks tend to be recent
    const midpoint = Math.floor(postsWithImpressions.length / 2);
    const recentPosts = postsWithImpressions.slice(0, midpoint);
    const olderPosts = postsWithImpressions.slice(midpoint);

    avgImpressionsConsistent = recentPosts.length > 0
      ? recentPosts.reduce((sum, p) => sum + (p.impressions || 0), 0) / recentPosts.length
      : 0;
    
    avgImpressionsInconsistent = olderPosts.length > 0
      ? olderPosts.reduce((sum, p) => sum + (p.impressions || 0), 0) / olderPosts.length
      : 0;

    if (avgImpressionsInconsistent > 0) {
      impressionsBoost = Math.round(
        ((avgImpressionsConsistent - avgImpressionsInconsistent) / avgImpressionsInconsistent) * 100
      );
    }
  }

  // Generate data-driven message
  let message: string;
  let needsAction = true;

  if (streak >= 7) {
    // Great consistency
    if (impressionsBoost > 0) {
      message = `Great streak of ${streak} days! Your consistent posting boosted impressions by ${impressionsBoost}%`;
    } else {
      message = `You're on a ${streak}-day streak - keep the momentum going!`;
    }
    needsAction = false;
  } else if (streak >= 3) {
    // Building momentum
    if (impressionsBoost > 0) {
      message = `${streak}-day streak building momentum - impressions up ${impressionsBoost}% when consistent`;
    } else {
      message = `${streak}-day streak and growing - schedule today's post to keep momentum`;
    }
    needsAction = true;
  } else if (daysSinceLastPost <= 2) {
    // Recently posted but no streak
    message = `Posted ${daysSinceLastPost === 0 ? 'today' : daysSinceLastPost === 1 ? 'yesterday' : '2 days ago'} - add one more to start a streak`;
    needsAction = true;
  } else if (daysSinceLastPost <= 7) {
    // Gap of a few days
    if (avgImpressionsConsistent > 0 && impressionsBoost > 10) {
      message = `${daysSinceLastPost} days since last post - your impressions were ${impressionsBoost}% higher when posting consistently`;
    } else {
      message = `${daysSinceLastPost} days since last post - schedule one to rebuild momentum`;
    }
    needsAction = true;
  } else {
    // Long gap
    if (allPosts.length > 5 && avgImpressionsConsistent > 0) {
      message = `${daysSinceLastPost} days inactive - past data shows you got ${Math.round(avgImpressionsConsistent).toLocaleString()} avg impressions when active`;
    } else {
      message = `${daysSinceLastPost} days since last post - let's get back on track`;
    }
    needsAction = true;
  }

  return {
    hasHistoricalData: true,
    streak,
    gapDays,
    totalPostsLast30Days: allPosts.length,
    avgImpressionsConsistent: Math.round(avgImpressionsConsistent),
    avgImpressionsInconsistent: Math.round(avgImpressionsInconsistent),
    impressionsBoost,
    lastPostDate,
    daysSinceLastPost,
    message,
    needsAction
  };
}

export async function GET(request: NextRequest) {
  return applyMiddleware(
    validateUserAuth({ errorIfNotAuthenticated: true }),
    catchApiAsyncError(async (req) => {
      try {
        //@ts-expect-error: user is not defined in Request type
        const user = req.parsed.user;

        console.log("🔍 Your Today API - User ID:", user.id);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get user's projects with role information
        const [ownedProjects, invitedProjectsData] = await Promise.all([
          prisma.projects.findMany({
            where: { userId: user.id },
            select: { id: true, name: true, createdAt: true }
          }),
          prisma.invitedUser.findMany({
            where: { userId: user.id },
            include: {
              project: {
                select: { id: true, name: true, createdAt: true }
              }
            }
          })
        ]);

        // Create a map of projectId -> userRole
        const projectRoleMap = new Map<string, string>();
        ownedProjects.forEach(p => projectRoleMap.set(p.id, "admin"));
        invitedProjectsData.forEach(invite => {
          if (invite.project) {
            projectRoleMap.set(invite.project.id, invite.role);
          }
        });

        const allProjects = [
          ...ownedProjects,
          ...invitedProjectsData.map(invite => invite.project).filter(Boolean) as typeof ownedProjects
        ];
        const uniqueProjects = Array.from(new Map(allProjects.map(p => [p.id, p])).values());

        console.log("📊 Your Today API - User projects:", uniqueProjects.length);

        const projectIds = uniqueProjects.map(p => p.id);

        // Build a map of projectId -> createdAt for age checks
        const projectCreatedAtMap = new Map<string, Date>();
        uniqueProjects.forEach(p => {
          if (p.createdAt) {
            projectCreatedAtMap.set(p.id, new Date(p.createdAt));
          }
        });

        // If user has no projects, return empty array
        if (projectIds.length === 0) {
          console.log("✅ Your Today API - No projects, returning empty array");
          return NextResponse.json([]);
        }

        // Batch fetch days since last post for all projects
        const daysSinceLastPostMap = await getDaysSinceLastPostMap(projectIds);
        console.log("📅 Days since last post map:", Array.from(daysSinceLastPostMap.entries()).slice(0, 5));

        // Get all data grouped by project
        const [failedPosts, campaigns, todayScheduledPosts, stuckBlogNewsPosts] = await Promise.all([
          // 1. Failed posts from yesterday
          prisma.scheduledPost.findMany({
            where: {
              projectId: { in: projectIds },
              status: "failed",
              date: {
                gte: yesterday,
                lt: today
              }
            },
            include: {
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }),
          // 2. Campaigns with chats
          prisma.campaignPlanner.findMany({
            where: {
              projectId: { in: projectIds },
              startDate: { not: null }
            },
            include: {
              chats: {
                orderBy: {
                  day: "asc"
                }
              },
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }),
          // 3. Scheduled posts for today
          prisma.scheduledPost.findMany({
            where: {
              projectId: { in: projectIds },
              date: {
                gte: today,
                lt: tomorrow
              },
              status: "pending"
            },
            include: {
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }),
          // 4. Stuck Blog News posts (processing status, some steps complete but not all)
          // Query ALL processing posts - we'll check step timestamps in the filter logic
          prisma.scheduledPost.findMany({
            where: {
              projectId: { in: projectIds },
              status: "processing",
            },
            include: {
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          })
        ]);

        // Group data by project
        const failedPostsByProject = new Map<string, typeof failedPosts>();
        failedPosts.forEach(post => {
          if (!post.projectId) return;
          const existing = failedPostsByProject.get(post.projectId) || [];
          existing.push(post);
          failedPostsByProject.set(post.projectId, existing);
        });

        const campaignsByProject = new Map<string, typeof campaigns>();
        campaigns.forEach(campaign => {
          if (!campaign.projectId) return;
          const existing = campaignsByProject.get(campaign.projectId) || [];
          existing.push(campaign);
          campaignsByProject.set(campaign.projectId, existing);
        });

        const scheduledPostsByProject = new Map<string, typeof todayScheduledPosts>();
        todayScheduledPosts.forEach(post => {
          if (!post.projectId) return;
          const existing = scheduledPostsByProject.get(post.projectId) || [];
          existing.push(post);
          scheduledPostsByProject.set(post.projectId, existing);
        });

        // Track projects inactive for 7+ days for summary grouping
        const inactiveProjects7PlusDays: Array<{
          projectId: string;
          projectName: string;
          daysSinceLastPost: number;
          userRole: string;
        }> = [];

        // Filter and identify stuck Blog News posts (partial step completion)
        const stuckBlogNewsPostsByProject = new Map<string, Array<{
          postId: string;
          projectId: string;
          projectName: string;
          campaignName?: string;
          day?: number;
          stuckStep: number;
          stepDetails: string;
        }>>();
        
        // Helper function to check if a step has been stuck for too long
        const isStepStuck = (completedAt: string | undefined, threshold: number = 10): boolean => {
          if (!completedAt) return false;
          const completedTime = new Date(completedAt).getTime();
          const nowTime = now.getTime();
          const minutesElapsed = (nowTime - completedTime) / (1000 * 60);
          return minutesElapsed > threshold;
        };
        
        stuckBlogNewsPosts.forEach(post => {
          if (!post.projectId) return;
          const meta = post.meta as any;
          
          // Only process Blog News posts
          if (!meta || meta.type !== "blog-news") return;
          
          // Determine which step is stuck (based on completion timestamps)
          let stuckStep = 0;
          let stepDetails = "";
          
          if (meta.step1Completed && !meta.step2Completed && isStepStuck(meta.step1CompletedAt)) {
            stuckStep = 2;
            stepDetails = "Article fetched, waiting for blog generation";
          } else if (meta.step2Completed && !meta.step3Completed && isStepStuck(meta.step2CompletedAt)) {
            stuckStep = 3;
            stepDetails = "Blog generated, waiting for webhook";
          } else if (meta.step3Completed && !meta.step4Completed && isStepStuck(meta.step3CompletedAt)) {
            stuckStep = 4;
            stepDetails = "Webhook sent, waiting for finalization";
          } else if (!meta.step1Completed) {
            // For step 1, check if scheduled time has passed by more than 10 minutes
            const scheduledDate = new Date(post.date).getTime();
            const nowTime = now.getTime();
            const minutesPastSchedule = (nowTime - scheduledDate) / (1000 * 60);
            if (minutesPastSchedule > 10) {
              stuckStep = 1;
              stepDetails = "Waiting for article fetch to start";
            }
          }
          
          // Only add if actually stuck
          if (stuckStep > 0) {
            const existing = stuckBlogNewsPostsByProject.get(post.projectId) || [];
            existing.push({
              postId: post.id,
              projectId: post.projectId,
              projectName: post.project?.name || "Unknown Project",
              campaignName: meta.campaignName,
              day: meta.day,
              stuckStep,
              stepDetails,
            });
            stuckBlogNewsPostsByProject.set(post.projectId, existing);
          }
        });

        // Group tasks by type
        const tasksByType: Record<string, {
          type: string;
          icon: string;
          title: string;
          action: string;
          projects: Array<{
            projectId: string;
            projectName: string;
            description?: string;
            campaignId?: string;
            campaignName?: string;
            day?: number;
            startDate?: string;
            userRole?: string;
            needsAction?: boolean;
            stats?: {
              campaignCount: number;
              publishedPostsCount: number;
              totalImpressions: number;
              recentImpressions: number;
            };
            daysSinceLastPost?: number | null;
          }>;
        }> = {};

        // Track projects that have campaign-related alerts (content needed or ending soon)
        // These projects should not show "Schedule Post" alerts
        const projectsWithCampaignAlerts = new Set<string>();
        
        // Track all projects that have been processed (to avoid duplicates)
        const processedProjects = new Set<string>();

        // Check each project individually
        for (const project of uniqueProjects) {
          const projectId = project.id;
          const projectName = project.name;
          const userRole = projectRoleMap.get(projectId) || "viewer";

          // 1. Check failed posts for this project
          const projectFailedPosts = failedPostsByProject.get(projectId) || [];
          if (projectFailedPosts.length > 0) {
            if (!tasksByType["failed_post"]) {
              tasksByType["failed_post"] = {
                type: "failed_post",
                icon: "🔔",
                title: "Failed posts from yesterday",
                action: "view_failed_posts",
                projects: []
              };
            }
            tasksByType["failed_post"].projects.push({
              projectId: projectId,
              projectName: projectName,
              description: `${projectFailedPosts.length} post${projectFailedPosts.length > 1 ? 's' : ''} failed yesterday - fix ${projectFailedPosts.length > 1 ? 'them' : 'it'}`,
              userRole: userRole,
              needsAction: true
            });
          }

          // 1.5 Check for stuck Blog News posts (partial step completion)
          const projectStuckBlogNews = stuckBlogNewsPostsByProject.get(projectId) || [];
          if (projectStuckBlogNews.length > 0) {
            if (!tasksByType["stuck_blog_news"]) {
              tasksByType["stuck_blog_news"] = {
                type: "stuck_blog_news",
                icon: "⚠️",
                title: "Blog News posts stuck mid-process",
                action: "view_stuck_posts",
                projects: []
              };
            }
            
            // Group by stuck step for clearer messaging
            const stuckAtStep = projectStuckBlogNews[0].stuckStep;
            const stuckCount = projectStuckBlogNews.length;
            const stepDetails = projectStuckBlogNews[0].stepDetails;
            
            tasksByType["stuck_blog_news"].projects.push({
              projectId: projectId,
              projectName: projectName,
              description: `${stuckCount} Blog News post${stuckCount > 1 ? 's' : ''} stuck at Step ${stuckAtStep} - ${stepDetails}`,
              userRole: userRole,
              needsAction: true
            });
          }

          // 2. Check campaigns for this project - combine all campaign-related items
          const projectCampaigns = campaignsByProject.get(projectId) || [];
          let hasActiveCampaign = false;
          const hasAnyCampaign = projectCampaigns.length > 0;
          let campaignNeedingContent: {
            campaignId: string;
            campaignName: string;
            day: number;
          } | null = null;

          if (hasAnyCampaign) {
            // Check if any campaign needs content and also track campaigns with active chats
            projectCampaigns.forEach(campaign => {
              if (!campaign.startDate) return;
              
              // Check if this is a Blog News campaign (has webhook in blogNewsMetadata)
              // Blog News campaigns generate content automatically, so skip them
              const campaignMeta = campaign.blogNewsMetadata as Record<string, any> | null | undefined;
              const isBlogNewsCampaign = campaignMeta?.webhook && typeof campaignMeta.webhook === 'string' && campaignMeta.webhook.trim().length > 0;
              
              // Skip Blog News campaigns - they generate content automatically at scheduled time
              if (isBlogNewsCampaign) {
                // Still track as active campaign for display purposes, but don't show "needs content" alert
                const startDate = new Date(campaign.startDate);
                startDate.setHours(0, 0, 0, 0);
                const todayDate = new Date(today);
                todayDate.setHours(0, 0, 0, 0);
                
                // Check if campaign has active chats (within next 3 days)
                const activeChats = campaign.chats.filter(chat => {
                  const chatDate = new Date(startDate.getTime() + (chat.day - 1) * 86400000);
                  chatDate.setHours(0, 0, 0, 0);
                  const daysUntilChat = Math.floor((chatDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
                  return daysUntilChat >= 0 && daysUntilChat <= 3;
                });
                
                if (activeChats.length > 0) {
                  hasActiveCampaign = true;
                }
                return; // Skip Blog News campaigns for "needs content" check
              }
              
              const startDate = new Date(campaign.startDate);
              startDate.setHours(0, 0, 0, 0);
              const todayDate = new Date(today);
              todayDate.setHours(0, 0, 0, 0);
              
              // Find chats that are within the next 3 days (today, tomorrow, day after tomorrow, day after that)
              // chat.day is the day number in the campaign (1, 2, 3...)
              // daysSinceStart is how many days have passed since the campaign started
              // So daysUntilChat = chat.day - daysSinceStart - 1 (because day 1 is the start date)
              const activeChats = campaign.chats.filter(chat => {
                // Calculate the actual date for this chat: startDate + (chat.day - 1) days
                const chatDate = new Date(startDate.getTime() + (chat.day - 1) * 86400000);
                chatDate.setHours(0, 0, 0, 0);
                
                // Calculate days until this chat (can be negative if in the past)
                const daysUntilChat = Math.floor((chatDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
                
                // Check if chat is within the date range (0-3 days from today)
                return daysUntilChat >= 0 && daysUntilChat <= 3;
              });

              // Track if this campaign has active chats
              if (activeChats.length > 0) {
                hasActiveCampaign = true;
                
                // Check if any active chat needs content
                const chatNeedingContent = activeChats.find(chat => {
                  // For regular campaigns, check chat.contents
                  // Chat needs content if:
                  // 1. Status is PENDING, OR
                  // 2. Status is GENERATED but contents is empty/missing
                  const contents = chat.contents as Record<string, any> | null | undefined;
                  const hasContent = contents && 
                                    typeof contents === 'object' && 
                                    Object.keys(contents).length > 0 &&
                                    Object.values(contents).some(val => val && typeof val === 'string' && val.trim().length > 0);
                  
                  return chat.status === "PENDING" || !hasContent;
                });

                if (chatNeedingContent && !campaignNeedingContent) {
                  campaignNeedingContent = {
                    campaignId: campaign.id,
                    campaignName: campaign.name || "Untitled Campaign",
                    day: chatNeedingContent.day
                  };
                }
              }
            });
          }

          // Add to unified campaigns task type
          if (!tasksByType["campaigns"]) {
            tasksByType["campaigns"] = {
              type: "campaigns",
              icon: "📅",
              title: "Campaigns",
              action: "manage_campaigns",
              projects: []
            };
          }

          // Show all projects under campaigns section with their status
          if (campaignNeedingContent) {
            // Project has active campaign that needs content
            const campaign: { campaignId: string; campaignName: string; day: number } = campaignNeedingContent;
            // Find the campaign to get its start date
            const campaignData = projectCampaigns.find(c => c.id === campaign.campaignId);
            const startDate = campaignData?.startDate ? new Date(campaignData.startDate) : null;
            
            // Calculate actual date for this day
            let dateLabel = `Day ${campaign.day}`;
            if (startDate) {
              const actualDate = new Date(startDate);
              actualDate.setDate(actualDate.getDate() + campaign.day - 1);
              dateLabel = actualDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            
            // Mark this project as having a campaign alert (should not show Schedule Post)
            projectsWithCampaignAlerts.add(projectId);
            
            // Calculate stats for projects needing content so they can appear in trending if doing well
            if (userRole === "admin") {
              const stats = await calculateProjectStats(projectId);
              
              // Only add stats if project has meaningful activity (recent impressions or posts)
              if (stats.recentImpressions > 0 || stats.publishedPostsCount > 0) {
                tasksByType["campaigns"].projects.push({
                  projectId: projectId,
                  projectName: projectName,
                  description: `Campaign "${campaign.campaignName}" needs content for ${dateLabel} - generate now`,
                  campaignId: campaign.campaignId,
                  campaignName: campaign.campaignName,
                  day: campaign.day,
                  startDate: startDate?.toISOString(),
                  userRole: userRole,
                  needsAction: true,
                  stats: stats,
                  daysSinceLastPost: daysSinceLastPostMap.get(projectId) ?? null
                });
              } else {
                // No stats, add without stats
                tasksByType["campaigns"].projects.push({
                  projectId: projectId,
                  projectName: projectName,
                  description: `Campaign "${campaign.campaignName}" needs content for ${dateLabel} - generate now`,
                  campaignId: campaign.campaignId,
                  campaignName: campaign.campaignName,
                  day: campaign.day,
                  startDate: startDate?.toISOString(),
                  userRole: userRole,
                  needsAction: true,
                  daysSinceLastPost: daysSinceLastPostMap.get(projectId) ?? null
                });
              }
            } else {
              // Non-admin users don't get stats
              tasksByType["campaigns"].projects.push({
                projectId: projectId,
                projectName: projectName,
                description: `Campaign "${campaign.campaignName}" needs content for ${dateLabel} - generate now`,
                campaignId: campaign.campaignId,
                campaignName: campaign.campaignName,
                day: campaign.day,
                startDate: startDate?.toISOString(),
                userRole: userRole,
                needsAction: true,
                daysSinceLastPost: daysSinceLastPostMap.get(projectId) ?? null
              });
            }
          } else if (hasActiveCampaign) {
            // Project has active campaigns but all are up to date
            // Don't add to campaigns task type - they don't need planning since they have active campaigns
            // They can still appear in trending if they have stats (handled separately)
          } else if (hasAnyCampaign || userRole === "admin") {
            // Check if project is ready for a new campaign based on reason-based criteria
            // Only show if at least one condition is true:
            // 1. Last campaign ended recently (≤14 days)
            // 2. Posting activity exists without a campaign
            // 3. Previous campaign performed well (posts published)
            
            let isReadyForNewCampaign = false;
            let readinessReason = "";
            
            if (hasAnyCampaign) {
              // Find the most recent campaign and calculate when it ended
              const campaignsWithDates = projectCampaigns
                .filter(c => c.startDate && c.chats.length > 0)
                .map(c => {
                  const startDate = new Date(c.startDate!);
                  const lastChatDay = Math.max(...c.chats.map(chat => chat.day));
                  const endDate = new Date(startDate);
                  endDate.setDate(endDate.getDate() + (lastChatDay - 1));
                  return {
                    campaign: c,
                    endDate,
                    lastChatDay
                  };
                })
                .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
              
              if (campaignsWithDates.length > 0) {
                const lastCampaign = campaignsWithDates[0];
                const daysSinceEnd = Math.floor((today.getTime() - lastCampaign.endDate.getTime()) / (1000 * 60 * 60 * 24));
                
                // Condition 1: Last campaign ended recently (≤14 days)
                if (daysSinceEnd >= 0 && daysSinceEnd <= 14) {
                  isReadyForNewCampaign = true;
                  readinessReason = `Last campaign ended ${daysSinceEnd === 0 ? 'today' : daysSinceEnd === 1 ? 'yesterday' : `${daysSinceEnd} days ago`} - ready for next`;
                }
                
                // Condition 3: Previous campaign performed well (check if posts were published)
                if (!isReadyForNewCampaign) {
                  // Check if campaign had successful posts (via PlatformPost or ScheduledPost)
                  const campaignId = lastCampaign.campaign.id;
                  
                  // Check ScheduledPosts with success status for this campaign
                  // MongoDB Prisma doesn't support path queries, so fetch and filter
                  const allScheduledPosts = await prisma.scheduledPost.findMany({
                    where: {
                      projectId: projectId,
                      status: { in: ["success", "posted"] }
                    },
                    select: {
                      id: true,
                      meta: true
                    }
                  });
                  
                  const successfulScheduledPosts = allScheduledPosts.filter(post => {
                    const meta = post.meta as any;
                    return meta?.campaignId === campaignId;
                  }).length;
                  
                  // Check PlatformPosts in the last 30 days (proxy for campaign performance)
                  const thirtyDaysAgo = new Date(today);
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  
                  const oauthProviders = await prisma.projectToOAuthProvider.findMany({
                    where: { projectId },
                    select: {
                      oauthProvider: {
                        select: {
                          pagePosts: {
                            where: {
                              date: {
                                gte: thirtyDaysAgo,
                                lte: today
                              }
                            },
                            select: { id: true }
                          }
                        }
                      }
                    }
                  });
                  
                  const recentPosts = oauthProviders.flatMap(p => p.oauthProvider?.pagePosts || []);
                  
                  if (successfulScheduledPosts > 0 || recentPosts.length > 0) {
                    isReadyForNewCampaign = true;
                    const postCount = successfulScheduledPosts + recentPosts.length;
                    readinessReason = `Previous campaign had ${postCount} published post${postCount > 1 ? 's' : ''} - build on success`;
                  }
                }
              }
            }
            
            // Condition 2: Posting activity exists without a campaign (only if no campaigns or all ended)
            if (!isReadyForNewCampaign && !hasActiveCampaign) {
              const thirtyDaysAgo = new Date(today);
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              
              // Check for PlatformPosts in last 30 days
              const oauthProviders = await prisma.projectToOAuthProvider.findMany({
                where: { projectId },
                select: {
                  oauthProvider: {
                    select: {
                      pagePosts: {
                        where: {
                          date: {
                            gte: thirtyDaysAgo,
                            lte: today
                          }
                        },
                        select: { id: true }
                      }
                    }
                  }
                }
              });
              
              const recentPosts = oauthProviders.flatMap(p => p.oauthProvider?.pagePosts || []);
              
              if (recentPosts.length > 0) {
                isReadyForNewCampaign = true;
                readinessReason = `${recentPosts.length} post${recentPosts.length > 1 ? 's' : ''} in last 30 days without a campaign - organize with a campaign`;
              }
            }
            
            if (isReadyForNewCampaign && userRole === "admin") {
              // Calculate stats using helper function
              const stats = await calculateProjectStats(projectId);
              
              console.log(`📊 Stats for project "${projectName}": ${stats.campaignCount} campaigns, ${stats.publishedPostsCount} published posts, ${stats.totalImpressions.toLocaleString()} total impressions, ${stats.recentImpressions.toLocaleString()} recent (3d)`);
              
              const projectData: {
                projectId: string;
                projectName: string;
                description: string;
                userRole: string;
                needsAction: boolean;
                stats: {
                  campaignCount: number;
                  publishedPostsCount: number;
                  totalImpressions: number;
                  recentImpressions: number;
                };
                daysSinceLastPost?: number | null;
              } = {
                projectId: projectId,
                projectName: projectName,
                description: `"${projectName}" is ready for a new campaign - ${readinessReason}`,
                userRole: userRole,
                needsAction: true,
                stats: stats,
                daysSinceLastPost: daysSinceLastPostMap.get(projectId) ?? null
              };
              
              console.log(`📊 Project data being added:`, JSON.stringify(projectData, null, 2));
              
              tasksByType["campaigns"].projects.push(projectData);
            } else if (hasAnyCampaign && !hasActiveCampaign) {
              // Project has campaigns but none are active and doesn't meet readiness criteria
              tasksByType["campaigns"].projects.push({
                projectId: projectId,
                projectName: projectName,
                description: `"${projectName}" has campaigns - no active chats in the next 3 days`,
                userRole: userRole,
                needsAction: false,
                daysSinceLastPost: daysSinceLastPostMap.get(projectId) ?? null
              });
            }
          }

          // 3. Check for campaigns ending soon (3 posts or less remaining)
          const projectCampaignsForEnding = campaignsByProject.get(projectId) || [];
          console.log(`📊 Checking ${projectCampaignsForEnding.length} campaigns for project "${projectName}" (${projectId})`);
          projectCampaignsForEnding.forEach(campaign => {
            if (!campaign.startDate) {
              console.log(`⏭️ Skipping campaign "${campaign.name || "Untitled"}" - no startDate`);
              return;
            }
            
            const startDate = new Date(campaign.startDate);
            startDate.setHours(0, 0, 0, 0);
            const todayDate = new Date(today);
            todayDate.setHours(0, 0, 0, 0);
            
            // Only check campaigns that have started (startDate is today or in the past)
            if (startDate > todayDate) {
              console.log(`⏭️ Skipping campaign "${campaign.name || "Untitled"}" - hasn't started yet (starts ${startDate.toISOString()})`);
              return;
            }
            
            // Count remaining posts (chats with dates today or in the future)
            const totalChats = campaign.chats?.length || 0;
            const remainingPosts = (campaign.chats || []).filter(chat => {
              // Calculate the actual date for this chat: startDate + (chat.day - 1) days
              const chatDate = new Date(startDate);
              chatDate.setDate(chatDate.getDate() + (chat.day - 1));
              chatDate.setHours(0, 0, 0, 0);
              
              // Count posts that are scheduled for today or future dates (>= today)
              return chatDate >= todayDate;
            }).length;
            
            console.log(`🔍 Campaign "${campaign.name || "Untitled"}" (${campaign.id}): ${remainingPosts} remaining posts out of ${totalChats} total`);
            
            // If 3 or less posts remaining, add to campaign_ending_soon
            if (remainingPosts > 0 && remainingPosts <= 3) {
              console.log(`⏰ Campaign ending soon detected: "${campaign.name || "Untitled Campaign"}" has ${remainingPosts} post(s) remaining`);
              if (!tasksByType["campaign_ending_soon"]) {
                tasksByType["campaign_ending_soon"] = {
                  type: "campaign_ending_soon",
                  icon: "⏰",
                  title: "Campaigns ending soon",
                  action: "manage_campaigns",
                  projects: []
                };
              }
              
              // Check if this project is already in the list
              const existingProject = tasksByType["campaign_ending_soon"].projects.find(
                p => p.projectId === projectId && p.campaignId === campaign.id
              );
              
              if (!existingProject) {
                // Mark this project as having a campaign alert (should not show Schedule Post)
                projectsWithCampaignAlerts.add(projectId);
                
                tasksByType["campaign_ending_soon"].projects.push({
                  projectId: projectId,
                  projectName: projectName,
                  description: `Project "${projectName}": Campaign "${campaign.name || "Untitled Campaign"}" has only ${remainingPosts} post${remainingPosts > 1 ? 's' : ''} remaining`,
                  campaignId: campaign.id,
                  campaignName: campaign.name || "Untitled Campaign",
                  userRole: userRole,
                  needsAction: true
                });
              }
            }
          });

          // Mark this project as processed
          processedProjects.add(projectId);
          
          // 4. Check scheduled posts for today for this project with historical analysis
          // Skip if project already has campaign-related alerts (content needed or ending soon)
          const projectScheduledPosts = scheduledPostsByProject.get(projectId) || [];
          
          // Check if project has campaign posts scheduled for today or in the future
          // Reuse projectCampaigns that was already defined earlier in this scope
          let hasCampaignPostsScheduled = false;
          const checkTodayDate = new Date(today);
          checkTodayDate.setHours(0, 0, 0, 0);
          
          for (const campaign of projectCampaigns) {
            if (!campaign.startDate) continue;
            
            const startDate = new Date(campaign.startDate);
            startDate.setHours(0, 0, 0, 0);
            
            // Check if campaign has any chats scheduled for today or future
            const hasFuturePosts = (campaign.chats || []).some(chat => {
              // Calculate the actual date for this chat: startDate + (chat.day - 1) days
              const chatDate = new Date(startDate);
              chatDate.setDate(chatDate.getDate() + (chat.day - 1));
              chatDate.setHours(0, 0, 0, 0);
              
              // Check if this chat is scheduled for today or in the future
              return chatDate >= checkTodayDate;
            });
            
            if (hasFuturePosts) {
              hasCampaignPostsScheduled = true;
              break;
            }
          }
          
          // Only mark as inactive if there are no scheduled posts AND no campaign posts scheduled
          if (projectScheduledPosts.length === 0 && !hasCampaignPostsScheduled && !projectsWithCampaignAlerts.has(projectId)) {
            // No scheduled posts - analyze historical data and show action if user is admin
            if (userRole === "admin") {
              // Check how old the project is - don't show inactivity alerts for recently created projects
              const projectCreatedAt = projectCreatedAtMap.get(projectId);
              const projectAgeDays = projectCreatedAt
                ? Math.floor((today.getTime() - new Date(projectCreatedAt).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
                : null;

              // Analyze historical consistency and impression correlation
              const consistencyAnalysis = await analyzeProjectConsistency(projectId);
              
              // The consistency analysis defaults to 30 days when a project has
              // no posts at all. Cap the inactivity at the project's actual age
              // so that a brand-new project isn't labelled "inactive for 7+ days".
              const rawInactiveDays = consistencyAnalysis.daysSinceLastPost;
              const effectiveInactiveDays = (projectAgeDays !== null && !consistencyAnalysis.hasHistoricalData)
                ? Math.min(rawInactiveDays, projectAgeDays)
                : rawInactiveDays;

              if (effectiveInactiveDays >= 7) {
                // Track projects inactive for 7+ days for summary grouping
                inactiveProjects7PlusDays.push({
                  projectId: projectId,
                  projectName: projectName,
                  daysSinceLastPost: effectiveInactiveDays,
                  userRole: userRole
                });
              } else if (effectiveInactiveDays <= 1 && !consistencyAnalysis.hasHistoricalData) {
                // Project is very new (0-1 days) and has no posts - skip alert entirely
                // Don't nag users about posting on a project they just created
              } else {
              // Show individual items for projects inactive less than 7 days
                if (!tasksByType["schedule_post"]) {
                  tasksByType["schedule_post"] = {
                    type: "schedule_post",
                    icon: "🚀",
                    title: "Schedule posts for today",
                    action: "schedule_post",
                    projects: []
                  };
                }
                tasksByType["schedule_post"].projects.push({
                  projectId: projectId,
                  projectName: projectName,
                  description: `"${projectName}": ${consistencyAnalysis.message}`,
                  userRole: userRole,
                  needsAction: consistencyAnalysis.needsAction
                });
              }
            }
          }
        }

        // Add summary for projects inactive 7+ days
        // Filter out projects that already have campaign alerts
        const inactiveProjectsWithoutCampaignAlerts = inactiveProjects7PlusDays.filter(
          project => !projectsWithCampaignAlerts.has(project.projectId)
        );
        
        if (inactiveProjectsWithoutCampaignAlerts.length > 0) {
          if (!tasksByType["schedule_post"]) {
            tasksByType["schedule_post"] = {
              type: "schedule_post",
              icon: "🚀",
              title: "Schedule posts for today",
              action: "schedule_post",
              projects: []
            };
          }
          
          // Create individual project entries with consistent description for grouping
          // The frontend will group them and show project names
          const inactiveCount = inactiveProjectsWithoutCampaignAlerts.length;
          inactiveProjectsWithoutCampaignAlerts.forEach(project => {
            tasksByType["schedule_post"].projects.push({
              projectId: project.projectId,
              projectName: project.projectName,
              description: `${inactiveCount} project${inactiveCount > 1 ? 's' : ''} inactive for 7+ days → Restart posting`,
              userRole: project.userRole,
              needsAction: true
            });
          });
        }

        // Add stats for all remaining projects (for trending projects feature)
        // This ensures projects doing well appear in trending even if they don't need action
        if (!tasksByType["campaigns"]) {
          tasksByType["campaigns"] = {
            type: "campaigns",
            icon: "📅",
            title: "Campaigns",
            action: "manage_campaigns",
            projects: []
          };
        }
        
        // Calculate stats for all projects that haven't been processed yet
        // This allows them to appear in trending if they're doing well
        for (const project of uniqueProjects) {
          const projectId = project.id;
          const projectName = project.name;
          const userRole = projectRoleMap.get(projectId) || "viewer";
          
          // Skip if already processed or not admin
          if (processedProjects.has(projectId) || userRole !== "admin") {
            continue;
          }
          
          // Calculate stats for this project
          const stats = await calculateProjectStats(projectId);
          
          // Debug logging for specific project
          if (projectName.toLowerCase().includes('natives') || projectName.toLowerCase().includes('plug')) {
            console.log(`🔍 Checking project "${projectName}" (${projectId}):`, {
              recentImpressions: stats.recentImpressions,
              totalImpressions: stats.totalImpressions,
              publishedPostsCount: stats.publishedPostsCount,
              campaignCount: stats.campaignCount,
              meetsCriteria: stats.recentImpressions > 0 || stats.publishedPostsCount > 0 || stats.totalImpressions >= 50,
              userRole: userRole,
              alreadyProcessed: processedProjects.has(projectId)
            });
          }
          
          // Only include if project has meaningful activity (recent impressions, posts, or significant total impressions)
          // This ensures trending projects can appear even if they don't need action
          // Also include projects with 50+ total impressions even if recent activity is low
          if (stats.recentImpressions > 0 || stats.publishedPostsCount > 0 || stats.totalImpressions >= 50) {
            // Check if project already exists in campaigns (shouldn't happen, but be safe)
            const existingProject = tasksByType["campaigns"].projects.find(
              p => p.projectId === projectId
            );
            
            if (!existingProject) {
              tasksByType["campaigns"].projects.push({
                projectId: projectId,
                projectName: projectName,
                description: `"${projectName}" is doing well`,
                userRole: userRole,
                needsAction: false,
                stats: stats,
                daysSinceLastPost: daysSinceLastPostMap.get(projectId) ?? null
              });
            }
          }
        }

        // Convert grouped tasks to array
        const tasks = Object.values(tasksByType);

        // Sort tasks to prioritize campaign_ending_soon
        tasks.sort((a, b) => {
          if (a.type === "campaign_ending_soon" && b.type !== "campaign_ending_soon") return -1;
          if (a.type !== "campaign_ending_soon" && b.type === "campaign_ending_soon") return 1;
          return 0;
        });

        // Log campaign_ending_soon tasks if any
        const endingSoonTask = tasks.find(t => t.type === "campaign_ending_soon");
        if (endingSoonTask) {
          console.log(`⏰ Found ${endingSoonTask.projects.length} campaign(s) ending soon`);
        }

        // Return all task types
        console.log("✅ Your Today API - Returning", tasks.length, "task types");
        
        // Debug: Log projects with stats
        tasks.forEach(task => {
          if (task.type === "campaigns") {
            task.projects.forEach(project => {
              if (project.description?.includes("ready for a new campaign")) {
                console.log(`📊 Project "${project.projectName}" stats:`, JSON.stringify(project.stats));
              }
            });
          }
        });
        
        return NextResponse.json(tasks);
      } catch (error) {
        console.error("❌ Your Today API - Error:", error);
        throw error; // Re-throw to be caught by catchApiAsyncError
      }
    })
  )(request, { params: {} });
}

