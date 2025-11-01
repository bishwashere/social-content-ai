import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import catchApiAsyncError from "@/lib/catch-api-async-error";

export async function GET(request: NextRequest) {
  return applyMiddleware(
    validateUserAuth({ errorIfNotAuthenticated: true }),
    catchApiAsyncError(async (req) => {
      //@ts-expect-error: user is not defined in Request type
      const user = req.parsed.user;

      console.log('🔍 /api/scheduled-posts/all - User ID:', user.id);
      console.log('🔍 /api/scheduled-posts/all - User email:', user.email);

      const scheduledPosts = await prisma.scheduledPost.findMany({
        where: {
          OR: [
            { project: { userId: user.id } },
            { project: { invitedUsers: { some: { userId: user.id } } } }
          ]
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          },
          oauthProvider: true,
        },
        orderBy: {
          date: "asc",
        },
      });

      console.log('📊 /api/scheduled-posts/all - Found posts:', scheduledPosts.length);
      if (scheduledPosts.length > 0) {
        console.log('📊 /api/scheduled-posts/all - Sample post:', {
          id: scheduledPosts[0].id,
          projectId: scheduledPosts[0].projectId,
          projectName: scheduledPosts[0].project?.name,
          date: scheduledPosts[0].date,
        });
      } else {
        // Debug: Check if there are any posts at all for this user's projects
        const userProjects = await prisma.projects.findMany({
          where: {
            OR: [
              { userId: user.id },
              { invitedUsers: { some: { userId: user.id } } }
            ]
          },
          select: { id: true, name: true }
        });
        console.log('📊 /api/scheduled-posts/all - User projects:', userProjects.length, userProjects.map(p => p.name));
        
        const totalPosts = await prisma.scheduledPost.count();
        console.log('📊 /api/scheduled-posts/all - Total scheduled posts in DB:', totalPosts);
      }

      // generate signed url for each post
      const withSignedUrl = await Promise.all(
        scheduledPosts.map(async (p) => {
          if (!p.media) return p;
          const signedUrl = await s3.getSignedUrlForVideoDownload(p.media);
          return {
            ...p,
            media: signedUrl,
          };
        })
      );

      console.log('✅ /api/scheduled-posts/all - Returning', withSignedUrl.length, 'posts');
      return NextResponse.json(withSignedUrl);
    })
  )(request, { params: {} });
}
