import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import catchApiAsyncError from "@/lib/catch-api-async-error";

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
        const [failedPosts, campaigns, todayScheduledPosts] = await Promise.all([
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
            tasksByType["campaigns"].projects.push({
              projectId: projectId,
              projectName: projectName,
              description: `Campaign "${campaign.campaignName}" needs content for Day ${campaign.day} — generate now`,
              campaignId: campaign.campaignId,
              campaignName: campaign.campaignName,
              day: campaign.day,
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

          // 4. Check scheduled posts for today for this project
          const projectScheduledPosts = scheduledPostsByProject.get(projectId) || [];
          if (projectScheduledPosts.length === 0) {
            // No scheduled posts - show action if user is admin
            if (userRole === "admin") {
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
                description: `"${projectName}" can boost consistency — schedule posts to keep your momentum`,
                userRole: userRole,
                needsAction: true
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

