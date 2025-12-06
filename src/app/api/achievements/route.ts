import { prisma } from "@/lib/prisma";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";

export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
      //@ts-expect-error: user is not defined in Request type
      const user = req.parsed.user;

      // Get user's projects (owned and invited)
      const [ownedProjects, invitedProjectsData] = await Promise.all([
        prisma.projects.findMany({
          where: { userId: user.id },
          select: { id: true }
        }),
        prisma.invitedUser.findMany({
          where: { userId: user.id },
          include: {
            project: {
              select: { id: true }
            }
          }
        })
      ]);

      const allProjectIds = [
        ...ownedProjects.map(p => p.id),
        ...invitedProjectsData.map(invite => invite.project?.id).filter(Boolean) as string[]
      ];
      const uniqueProjectIds = Array.from(new Set(allProjectIds));

      if (uniqueProjectIds.length === 0) {
        return sendNextResponse({
          status: 200,
          message: "Achievements retrieved successfully",
          data: {
            projectsWithCampaigns: 0,
            projectsWithScheduledPosts: 0,
            projectsWithVideos: 0,
            projectsWithTracking: 0,
          },
        });
      }

      // ALL-TIME ACHIEVEMENTS: Count all projects that have ever had these activities (no date filters)
      
      // Count projects with campaigns (all-time, ever created) - get all and deduplicate
      const campaigns = await prisma.campaignPlanner.findMany({
        where: {
          projectId: { in: uniqueProjectIds }
        },
        select: {
          projectId: true
        }
      });
      const uniqueCampaignProjects = new Set(campaigns.map(c => c.projectId));

      // Count projects with scheduled posts (all-time, ever scheduled, regardless of status)
      const scheduledPosts = await prisma.scheduledPost.findMany({
        where: {
          projectId: { in: uniqueProjectIds }
        },
        select: {
          projectId: true
        }
      });
      const uniqueScheduledPostProjects = new Set(scheduledPosts.map(p => p.projectId));

      // Also count projects with PlatformPost (all-time, actually posted content)
      // Get OAuth providers linked to user's projects
      const projectOAuthProviders = await prisma.projectToOAuthProvider.findMany({
        where: {
          projectId: { in: uniqueProjectIds }
        },
        select: {
          projectId: true,
          oauthProviderId: true
        }
      });
      const oauthProviderIds = Array.from(new Set(projectOAuthProviders.map(p => p.oauthProviderId)));
      
      const platformPosts = oauthProviderIds.length > 0 ? await prisma.platformPost.findMany({
        where: {
          oauthProviderId: { in: oauthProviderIds }
        },
        select: {
          oauthProviderId: true
        }
      }) : [];
      
      // Map oauthProviderId back to projectId
      const oauthProviderToProjectMap = new Map<string, string>();
      projectOAuthProviders.forEach(p => {
        oauthProviderToProjectMap.set(p.oauthProviderId, p.projectId);
      });
      
      const platformPostProjectIds = platformPosts
        .map(p => oauthProviderToProjectMap.get(p.oauthProviderId))
        .filter(Boolean) as string[];
      const uniquePlatformPostProjects = new Set(platformPostProjectIds);
      
      // Combine both scheduled posts and platform posts
      const allPostProjects = new Set([
        ...uniqueScheduledPostProjects,
        ...uniquePlatformPostProjects
      ]);

      // Count projects with videos (all-time, ever uploaded) - get all and deduplicate
      const videos = await prisma.uploadedVideo.findMany({
        where: {
          projectId: { in: uniqueProjectIds }
        },
        select: {
          projectId: true
        }
      });
      const uniqueVideoProjects = new Set(videos.map(v => v.projectId));

      // Count projects with tracking (all-time, ever tracked) - get all and deduplicate
      const trackings = await prisma.projectTracking.findMany({
        where: {
          projectId: { in: uniqueProjectIds }
        },
        select: {
          projectId: true
        }
      });
      const uniqueTrackingProjects = new Set(trackings.map(t => t.projectId));

      return sendNextResponse({
        status: 200,
        message: "Achievements retrieved successfully",
        data: {
          projectsWithCampaigns: uniqueCampaignProjects.size,
          projectsWithScheduledPosts: allPostProjects.size,
          projectsWithVideos: uniqueVideoProjects.size,
          projectsWithTracking: uniqueTrackingProjects.size,
        },
      });
  })
);

