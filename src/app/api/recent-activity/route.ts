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

        // Get user's projects
        const userProjects = await prisma.projects.findMany({
          where: {
            OR: [
              { userId: user.id },
              { invitedUsers: { some: { userId: user.id } } }
            ]
          },
          select: { id: true, name: true }
        });

        const projectIds = userProjects.map(p => p.id);

        if (projectIds.length === 0) {
          return NextResponse.json([]);
        }

        const activities = [];

        // 1. Get recent posts (PlatformPost) - posted successfully
        const recentPosts = await prisma.platformPost.findMany({
          where: {
            oauthProvider: {
              userId: user.id
            }
          },
          include: {
            oauthProvider: {
              select: {
                platform: true,
                id: true
              }
            }
          },
          orderBy: {
            date: "desc"
          },
          take: 20
        });

        // Get all project-to-oauth mappings for these posts in one query
        const oauthProviderIds = [...new Set(recentPosts.map(p => p.oauthProviderId))];
        const projectProviders = await prisma.projectToOAuthProvider.findMany({
          where: {
            oauthProviderId: { in: oauthProviderIds },
            projectId: { in: projectIds }
          },
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        // Create a map for quick lookup
        const providerToProject = new Map<string, typeof projectProviders[0]>();
        for (const provider of projectProviders) {
          providerToProject.set(provider.oauthProviderId, provider);
        }

        for (const post of recentPosts) {
          const projectProvider = providerToProject.get(post.oauthProviderId);
          
          if (projectProvider?.project) {
            const hoursAgo = Math.floor((Date.now() - post.date.getTime()) / (1000 * 60 * 60));
            const timeAgo = hoursAgo < 1 
              ? "just now" 
              : hoursAgo === 1 
              ? "1 hour ago" 
              : `${hoursAgo} hours ago`;

            // Get platform abbreviation
            const platformAbbr = post.oauthProvider.platform === "facebook" ? "FB" 
              : post.oauthProvider.platform === "instagram" ? "IG"
              : post.oauthProvider.platform === "twitter" ? "X"
              : post.oauthProvider.platform === "linkedin" ? "LI"
              : post.oauthProvider.platform.charAt(0).toUpperCase() + post.oauthProvider.platform.slice(1);

            activities.push({
              type: "posted",
              icon: "✔️",
              message: `Posted for ${projectProvider.project.name} on ${platformAbbr} ${timeAgo}`,
              projectName: projectProvider.project.name,
              projectId: projectProvider.project.id,
              timestamp: post.date.toISOString(),
              platform: post.oauthProvider.platform
            });
          }
        }

        // 2. Get scheduled posts that failed (missed posts)
        const failedScheduledPosts = await prisma.scheduledPost.findMany({
          where: {
            projectId: { in: projectIds },
            status: "failed",
            date: {
              lte: new Date() // Only past failed posts
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
          orderBy: {
            date: "desc"
          },
          take: 10
        });

        for (const post of failedScheduledPosts) {
          const hasContent = post.content && post.content.trim().length > 0;
          if (!hasContent) {
            const hoursAgo = Math.floor((Date.now() - post.date.getTime()) / (1000 * 60 * 60));
            const timeAgo = hoursAgo < 1 
              ? "just now" 
              : hoursAgo === 1 
              ? "1 hour ago" 
              : `${hoursAgo} hours ago`;

            activities.push({
              type: "scheduled_missed",
              icon: "⚠️",
              message: "Scheduled post missed - no template available",
              projectName: post.project?.name || "Unknown Project",
              projectId: post.projectId,
              timestamp: post.date.toISOString(),
              platform: post.platform
            });
          }
        }

        // 3. Get drafts ready for approval (CampaignChat with GENERATED status but not scheduled)
        const drafts = await prisma.campaignChat.findMany({
          where: {
            planner: {
              projectId: { in: projectIds }
            },
            status: "GENERATED",
            contents: {
              not: {}
            }
          },
          include: {
            planner: {
              include: {
                project: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            updatedAt: "desc"
          },
          take: 10
        });

        // Get all scheduled posts for these projects to check if drafts are scheduled
        const allScheduledPosts = await prisma.scheduledPost.findMany({
          where: {
            projectId: { in: projectIds }
          },
          select: {
            projectId: true,
            meta: true
          }
        });

        // Create a set of scheduled campaign days for quick lookup
        const scheduledCampaignDays = new Set<string>();
        for (const post of allScheduledPosts) {
          const meta = post.meta as any;
          if (meta && meta.campaignId && meta.day) {
            scheduledCampaignDays.add(`${post.projectId}-${meta.campaignId}-${meta.day}`);
          }
        }

        // Track which projects already have a draft notification to show only one per project
        const projectsWithDraft = new Set<string>();

        for (const draft of drafts) {
          // Skip if planner is null
          if (!draft.planner) {
            continue;
          }
          
          // Skip if we already have a draft notification for this project
          if (projectsWithDraft.has(draft.planner.projectId)) {
            continue;
          }

          // Check if this specific day has been scheduled
          const scheduledKey = `${draft.planner.projectId}-${draft.plannerId}-${draft.day}`;
          const isScheduled = scheduledCampaignDays.has(scheduledKey);

          // If not scheduled, it's a draft ready for approval
          if (!isScheduled) {
            projectsWithDraft.add(draft.planner.projectId);
            activities.push({
              type: "draft_ready",
              icon: "🟣",
              message: "Content ready and waiting for publish",
              projectName: draft.planner.project?.name || "Unknown Project",
              projectId: draft.planner.projectId,
              timestamp: draft.updatedAt.toISOString(),
              campaignId: draft.plannerId,
              day: draft.day
            });
          }
        }

        // 4. Get completed videos
        const completedVideos = await prisma.uploadedVideo.findMany({
          where: {
            userId: user.id,
            status: "completed"
          },
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            updatedAt: "desc"
          },
          take: 10
        });

        for (const video of completedVideos) {
          // Only include videos that belong to user's projects
          if (!video.projectId || !projectIds.includes(video.projectId)) {
            continue;
          }

          const hoursAgo = Math.floor((Date.now() - video.updatedAt.getTime()) / (1000 * 60 * 60));
          const timeAgo = hoursAgo < 1 
            ? "just now" 
            : hoursAgo === 1 
            ? "1 hour ago" 
            : `${hoursAgo} hours ago`;

          // Extract category from text or use default
          const category = video.text || "Video";

          activities.push({
            type: "video_completed",
            icon: "🎥",
            message: `Video completed for ${category}`,
            projectName: video.project?.name || "Unknown Project",
            projectId: video.projectId,
            timestamp: video.updatedAt.toISOString(),
            videoId: video.id
          });
        }

        // Sort all activities by timestamp (most recent first)
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Return last 20 activities
        return NextResponse.json(activities.slice(0, 20));
      } catch (error) {
        console.error("❌ Recent Activity API - Error:", error);
        throw error;
      }
    })
  )(request, { params: {} });
}

