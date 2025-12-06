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

        const projectIds = uniqueProjects.map(p => p.id);

        if (projectIds.length === 0) {
          return NextResponse.json([]);
        }

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
            userRole?: string;
          }>;
        }> = {};

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Check projects with no content for next week
        for (const project of uniqueProjects) {
          // Check if there are any scheduled posts or campaign content for next week
          const scheduledPostsNextWeek = await prisma.scheduledPost.count({
            where: {
              projectId: project.id,
              date: {
                gte: today,
                lte: nextWeek
              },
              status: { in: ["pending", "processing"] }
            }
          });

          // Check if there are active campaigns with content for next week
          const campaigns = await prisma.campaignPlanner.findMany({
            where: {
              projectId: project.id,
              startDate: { not: null }
            },
            include: {
              chats: true
            }
          });

          let hasCampaignContent = false;
          for (const campaign of campaigns) {
            if (!campaign.startDate) continue;
            const startDate = new Date(campaign.startDate);
            const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // Check if any chat in next week has content
            const hasContent = campaign.chats.some(chat => {
              const chatDay = chat.day;
              const daysUntilChat = chatDay - daysSinceStart;
              if (daysUntilChat >= 0 && daysUntilChat <= 7) {
                const contents = chat.contents as Record<string, any> | null | undefined;
                return contents && 
                       typeof contents === 'object' && 
                       Object.keys(contents).length > 0 &&
                       Object.values(contents).some(val => val && typeof val === 'string' && val.trim().length > 0);
              }
              return false;
            });
            
            if (hasContent) {
              hasCampaignContent = true;
              break;
            }
          }

          if (scheduledPostsNextWeek === 0 && !hasCampaignContent) {
            if (!tasksByType["no_content_next_week"]) {
              tasksByType["no_content_next_week"] = {
                type: "no_content_next_week",
                icon: "📅",
                title: "Generate weekly plan",
                action: "generate_weekly_plan",
                projects: []
              };
            }
            const userRole = projectRoleMap.get(project.id) || "viewer";
            tasksByType["no_content_next_week"].projects.push({
              projectId: project.id,
              projectName: project.name,
              description: `"${project.name}" is ready for next week's plan`,
              userRole: userRole
            });
          }
        }

        // 2. Check campaigns expiring tomorrow (campaigns where all days will have passed by tomorrow)
        const allCampaigns = await prisma.campaignPlanner.findMany({
          where: {
            projectId: { in: projectIds },
            startDate: { not: null }
          },
          include: {
            chats: {
              orderBy: {
                day: "desc"
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

        for (const campaign of allCampaigns) {
          if (!campaign.startDate) continue;
          const startDate = new Date(campaign.startDate);
          const lastDay = campaign.chats.length > 0 ? campaign.chats[0].day : 0;
          const lastDayDate = new Date(startDate.getTime() + (lastDay - 1) * 86400000);
          
          // Campaign expires tomorrow if the last day is tomorrow or earlier
          if (lastDayDate <= tomorrow && lastDayDate >= today) {
            if (!tasksByType["campaign_expiring"]) {
              tasksByType["campaign_expiring"] = {
                type: "campaign_expiring",
                icon: "⏰",
                title: "Extend or stop",
                action: "manage_campaign",
                projects: []
              };
            }
            const userRole = projectRoleMap.get(campaign.projectId) || "viewer";
            tasksByType["campaign_expiring"].projects.push({
              projectId: campaign.projectId,
              projectName: campaign.project?.name || "Unknown Project",
              description: `Campaign "${campaign.name || 'Untitled'}" in "${campaign.project?.name || 'Unknown Project'}" is expiring tomorrow`,
              campaignId: campaign.id,
              campaignName: campaign.name || "Untitled Campaign",
              userRole: userRole
            });
          }
        }


        // 4. Check template library for missing platform templates
        // Get all templates
        const allTemplates = await prisma.template.findMany({
          select: {
            id: true,
            title: true
          }
        });

        // Check if user has any projects with connected platforms
        const platforms = ["facebook", "linkedin", "twitter", "threads", "reddit", "tiktok", "instagram"];
        const connectedPlatforms = await prisma.projectToOAuthProvider.findMany({
          where: {
            projectId: { in: projectIds }
          },
          include: {
            oauthProvider: {
              select: {
                platform: true
              }
            }
          }
        });

        const userPlatforms = new Set(
          connectedPlatforms.map(cp => cp.oauthProvider?.platform).filter(Boolean)
        );

        // If user has connected platforms but no templates exist, suggest assigning templates
        // Only admins can assign templates, so check if user has admin access to any project
        const hasAdminAccess = Array.from(projectRoleMap.values()).some(role => role === "admin");
        if (userPlatforms.size > 0 && allTemplates.length === 0) {
          tasksByType["missing_templates"] = {
            type: "missing_templates",
            icon: "📝",
            title: "Assign one now",
            action: "assign_templates",
            projects: [{
              projectId: "",
              projectName: "",
              description: "Template library has no templates available. Create templates to improve content quality.",
              userRole: hasAdminAccess ? "admin" : "viewer"
            }]
          };
        }

        // Convert grouped tasks to array
        const tasks = Object.values(tasksByType);

        // Return max 5 task types
        return NextResponse.json(tasks.slice(0, 5));
      } catch (error) {
        console.error("❌ Pending Tasks API - Error:", error);
        throw error;
      }
    })
  )(request, { params: {} });
}

