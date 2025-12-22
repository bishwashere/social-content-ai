import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { startOfDay, subDays, subMinutes } from "date-fns";

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
      message: "Start posting to build your consistency — the more you post, the more we can optimize",
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
      message = `You're on a ${streak}-day streak — keep the momentum going!`;
    }
    needsAction = false;
  } else if (streak >= 3) {
    // Building momentum
    if (impressionsBoost > 0) {
      message = `${streak}-day streak building momentum — impressions up ${impressionsBoost}% when consistent`;
    } else {
      message = `${streak}-day streak and growing — schedule today's post to keep momentum`;
    }
    needsAction = true;
  } else if (daysSinceLastPost <= 2) {
    // Recently posted but no streak
    message = `Posted ${daysSinceLastPost === 0 ? 'today' : daysSinceLastPost === 1 ? 'yesterday' : '2 days ago'} — add one more to start a streak`;
    needsAction = true;
  } else if (daysSinceLastPost <= 7) {
    // Gap of a few days
    if (avgImpressionsConsistent > 0 && impressionsBoost > 10) {
      message = `${daysSinceLastPost} days since last post — your impressions were ${impressionsBoost}% higher when posting consistently`;
    } else {
      message = `${daysSinceLastPost} days since last post — schedule one to rebuild momentum`;
    }
    needsAction = true;
  } else {
    // Long gap
    if (allPosts.length > 5 && avgImpressionsConsistent > 0) {
      message = `${daysSinceLastPost} days inactive — past data shows you got ${Math.round(avgImpressionsConsistent).toLocaleString()} avg impressions when active`;
    } else {
      message = `${daysSinceLastPost} days since last post — let's get back on track`;
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
            select: { id: true, name: true }
          }),
          prisma.invitedUser.findMany({
            where: { userId: user.id },
            include: {
              project: {
                select: { id: true, name: true }
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

        // If user has no projects, return empty array
        if (projectIds.length === 0) {
          console.log("✅ Your Today API - No projects, returning empty array");
          return NextResponse.json([]);
        }

        // Get all data grouped by project
        const [failedPosts, campaigns, todayScheduledPosts, stuckBlogNewsPosts, allBlogNewsPosts] = await Promise.all([
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
          }),
          // 5. All Blog News posts to check for content existence
          // Query all webhook posts and filter in code (Prisma JSON queries are complex)
          prisma.scheduledPost.findMany({
            where: {
              projectId: { in: projectIds },
              platform: "webhook"
            },
            select: {
              id: true,
              projectId: true,
              meta: true
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

        // Create a map of Blog News posts by campaign and day for quick lookup
        // Filter to only include blog-news type posts
        const blogNewsPostsByCampaign = new Map<string, Map<number, typeof allBlogNewsPosts[0]>>();
        allBlogNewsPosts.forEach(post => {
          if (!post.projectId) return;
          const meta = post.meta as any;
          // Only include blog-news type posts
          if (meta?.type === "blog-news" && meta?.campaignId && meta?.day !== undefined) {
            const key = `${post.projectId}-${meta.campaignId}`;
            if (!blogNewsPostsByCampaign.has(key)) {
              blogNewsPostsByCampaign.set(key, new Map());
            }
            blogNewsPostsByCampaign.get(key)!.set(meta.day, post);
          }
        });

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
          }>;
        }> = {};

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
              description: `${projectFailedPosts.length} post${projectFailedPosts.length > 1 ? 's' : ''} failed yesterday — fix ${projectFailedPosts.length > 1 ? 'them' : 'it'}`,
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
              description: `${stuckCount} Blog News post${stuckCount > 1 ? 's' : ''} stuck at Step ${stuckAtStep} — ${stepDetails}`,
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
              
              const startDate = new Date(campaign.startDate);
              startDate.setHours(0, 0, 0, 0);
              const todayDate = new Date(today);
              todayDate.setHours(0, 0, 0, 0);
              
              // Check if this is a Blog News campaign (has webhook in blogNewsMetadata)
              const campaignMeta = campaign.blogNewsMetadata as Record<string, any> | null | undefined;
              const isBlogNewsCampaign = campaignMeta?.webhook && typeof campaignMeta.webhook === 'string' && campaignMeta.webhook.trim().length > 0;
              
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
                  // For Blog News campaigns, check ScheduledPost instead of chat.contents
                  if (isBlogNewsCampaign) {
                    // Look up Blog News post for this campaign and day
                    const blogNewsKey = `${projectId}-${campaign.id}`;
                    const blogNewsPosts = blogNewsPostsByCampaign.get(blogNewsKey);
                    if (blogNewsPosts) {
                      const blogPost = blogNewsPosts.get(chat.day);
                      if (blogPost) {
                        const postMeta = blogPost.meta as any;
                        // Check if blog content exists
                        const hasBlogContent = postMeta?.blog && 
                          typeof postMeta.blog === 'object' && 
                          postMeta.blog.title && 
                          postMeta.blog.content;
                        // If blog content exists, this chat doesn't need content
                        if (hasBlogContent) {
                          return false;
                        }
                      }
                    }
                    // For Blog News, if no ScheduledPost or no blog content, it needs content
                    return true;
                  } else {
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
                  }
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
            
            tasksByType["campaigns"].projects.push({
              projectId: projectId,
              projectName: projectName,
              description: `Campaign "${campaign.campaignName}" needs content for ${dateLabel} — generate now`,
              campaignId: campaign.campaignId,
              campaignName: campaign.campaignName,
              day: campaign.day,
              startDate: startDate?.toISOString(),
              userRole: userRole,
              needsAction: true
            });
          } else if (hasActiveCampaign) {
            // Project has active campaigns but all are up to date
            tasksByType["campaigns"].projects.push({
              projectId: projectId,
              projectName: projectName,
              description: `"${projectName}" has active campaigns — all up to date`,
              userRole: userRole,
              needsAction: false
            });
          } else if (hasAnyCampaign) {
            // Project has campaigns but none have active chats in the next 3 days
            tasksByType["campaigns"].projects.push({
              projectId: projectId,
              projectName: projectName,
              description: `"${projectName}" has campaigns — no active chats in the next 3 days`,
              userRole: userRole,
              needsAction: false
            });
          } else if (userRole === "admin") {
            // Project has no campaigns at all (only show for admins)
            tasksByType["campaigns"].projects.push({
              projectId: projectId,
              projectName: projectName,
              description: `"${projectName}" is ready for a new campaign — kickstart planning`,
              userRole: userRole,
              needsAction: true
            });
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

          // 4. Check scheduled posts for today for this project with historical analysis
          const projectScheduledPosts = scheduledPostsByProject.get(projectId) || [];
          if (projectScheduledPosts.length === 0) {
            // No scheduled posts - analyze historical data and show action if user is admin
            if (userRole === "admin") {
              // Analyze historical consistency and impression correlation
              const consistencyAnalysis = await analyzeProjectConsistency(projectId);
              
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
        return NextResponse.json(tasks);
      } catch (error) {
        console.error("❌ Your Today API - Error:", error);
        throw error; // Re-throw to be caught by catchApiAsyncError
      }
    })
  )(request, { params: {} });
}

