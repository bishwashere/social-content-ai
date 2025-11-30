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

        // 1. Check for failed posts from yesterday
        const failedPosts = await prisma.scheduledPost.findMany({
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
        },
          take: 1
        });

        // 2. Check for campaigns that need content
        const campaigns = await prisma.campaignPlanner.findMany({
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
        });

        const campaignsNeedingContent = campaigns
        .map(campaign => {
          if (!campaign.startDate) return null;
          const startDate = new Date(campaign.startDate);
          const todayDate = new Date(today);
          const daysSinceStart = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Find the next chat that needs content (for today or upcoming days within next 3 days)
          const nextChat = campaign.chats.find(chat => {
            const chatDay = chat.day;
            const daysUntilChat = chatDay - daysSinceStart;
            
            // Check if chat is within the date range
            if (daysUntilChat < 0 || daysUntilChat > 3) {
              return false;
            }
            
            // Chat needs content if:
            // 1. Status is PENDING, OR
            // 2. Status is GENERATED but contents is empty/missing
            const contents = chat.contents as Record<string, any> | null | undefined;
            const hasContent = contents && 
                              typeof contents === 'object' && 
                              Object.keys(contents).length > 0 &&
                              Object.values(contents).some(val => val && typeof val === 'string' && val.trim().length > 0);
            
            const needsContent = chat.status === "PENDING" || !hasContent;
            
            return needsContent;
          });

          if (!nextChat) return null;

          return {
            campaignId: campaign.id,
            campaignName: campaign.name || "Untitled Campaign",
            projectId: campaign.projectId,
            projectName: campaign.project?.name || "Unknown Project",
            day: nextChat.day
          };
        })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .slice(0, 1);

        // 3. Check scheduled posts for today
        const todayScheduledPosts = await prisma.scheduledPost.findMany({
        where: {
          projectId: { in: projectIds },
          date: {
            gte: today,
            lt: tomorrow
          },
          status: "pending"
          },
          select: {
            id: true
          }
        });

        const actionItems = [];

        // Add failed posts item
        if (failedPosts.length > 0) {
          const projectId = failedPosts[0].projectId;
          const userRole = projectRoleMap.get(projectId) || "viewer";
          actionItems.push({
            type: "failed_post",
            icon: "🔔",
            title: `${failedPosts.length} post${failedPosts.length > 1 ? 's' : ''} failed yesterday — fix ${failedPosts.length > 1 ? 'them' : 'it'}`,
            projectId: projectId,
            projectName: failedPosts[0].project?.name,
            userRole: userRole,
            action: "view_failed_posts"
          });
        }

        // Add campaign needing content item
        if (campaignsNeedingContent.length > 0) {
          const campaign = campaignsNeedingContent[0];
          const userRole = projectRoleMap.get(campaign.projectId) || "viewer";
          actionItems.push({
            type: "campaign_content",
            icon: "📝",
            title: `You have a campaign that needs content for Day ${campaign.day} — generate now`,
            projectId: campaign.projectId,
            projectName: campaign.projectName,
            campaignId: campaign.campaignId,
            campaignName: campaign.campaignName,
            day: campaign.day,
            userRole: userRole,
            action: "generate_campaign_content"
          });
        }

        // Add scheduled posts for today
        if (todayScheduledPosts.length === 0) {
          // For schedule_post, check if user has admin role in any project
          const hasAdminAccess = Array.from(projectRoleMap.values()).some(role => role === "admin");
          actionItems.push({
            type: "schedule_post",
            icon: "🚀",
            title: "You scheduled 0 posts for today — want to schedule one?",
            userRole: hasAdminAccess ? "admin" : "viewer",
            action: "schedule_post"
          });
        }

        // Return max 3 items
        console.log("✅ Your Today API - Returning", actionItems.length, "items");
        return NextResponse.json(actionItems.slice(0, 3));
      } catch (error) {
        console.error("❌ Your Today API - Error:", error);
        throw error; // Re-throw to be caught by catchApiAsyncError
      }
    })
  )(request, { params: {} });
}

