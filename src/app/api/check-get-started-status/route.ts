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
          select: { id: true }
        });

        const projectIds = userProjects.map(p => p.id);

        if (projectIds.length === 0) {
          return NextResponse.json({
            hasPosts: false,
            hasCampaigns: false,
            hasScheduledOrPublished: false
          });
        }

        // Check if user has any posts (scheduled or published)
        const scheduledPostsCount = await prisma.scheduledPost.count({
          where: {
            projectId: { in: projectIds }
          }
        });

        const platformPostsCount = await prisma.platformPost.count({
          where: {
            oauthProvider: {
              userId: user.id,
              projectToOAuthProviders: {
                some: {
                  projectId: { in: projectIds }
                }
              }
            }
          }
        });

        const hasPosts = scheduledPostsCount > 0 || platformPostsCount > 0;
        const hasScheduledOrPublished = scheduledPostsCount > 0 || platformPostsCount > 0;

        // Check if user has any campaigns
        const campaignsCount = await prisma.campaignPlanner.count({
          where: {
            projectId: { in: projectIds }
          }
        });

        const hasCampaigns = campaignsCount > 0;

        return NextResponse.json({
          hasPosts,
          hasCampaigns,
          hasScheduledOrPublished
        });
      } catch (error) {
        console.error("❌ Check Get Started Status API - Error:", error);
        throw error;
      }
    })
  )(request, { params: {} });
}

