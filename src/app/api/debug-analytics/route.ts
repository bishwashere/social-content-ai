import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import catchApiAsyncError from "@/lib/catch-api-async-error";

export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;
    const email = req.nextUrl.searchParams.get("email") || user.email;

    console.log("🔍 Debugging analytics for email:", email);

    // 1. Find user
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({
        error: "User not found",
        email,
      });
    }

    console.log("✅ User found:", dbUser.id, dbUser.email);

    // 2. Get user's projects
    const projects = await prisma.projects.findMany({
      where: { userId: dbUser.id },
      select: {
        id: true,
        name: true,
        userId: true,
      },
    });

    console.log("📁 Projects found:", projects.length);
    projects.forEach(p => console.log("  -", p.id, p.name));

    // 3. Get OAuth providers
    const oauthProviders = await prisma.oauthProvider.findMany({
      where: { userId: dbUser.id },
      select: {
        id: true,
        platform: true,
        pageName: true,
        pageId: true,
        createdAt: true,
        pagePosts: {
          select: {
            id: true,
            postId: true,
            date: true,
            likes: true,
            comments: true,
            impressions: true,
          },
        },
        projectToOAuthProviders: {
          select: {
            projectId: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    console.log("🔗 OAuth Providers found:", oauthProviders.length);
    oauthProviders.forEach(p => {
      console.log("  -", p.platform, p.pageName, "| Posts:", p.pagePosts.length, "| Linked to projects:", p.projectToOAuthProviders.length);
      p.projectToOAuthProviders.forEach(mapping => {
        console.log("    → Project:", mapping.project?.name || mapping.projectId);
      });
    });

    // 4. Get all ProjectToOAuthProvider mappings
    const mappings = await prisma.projectToOAuthProvider.findMany({
      where: {
        oauthProvider: {
          userId: dbUser.id,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        oauthProvider: {
          select: {
            id: true,
            platform: true,
            pageName: true,
          },
        },
      },
    });

    console.log("🔗 Project Mappings found:", mappings.length);
    mappings.forEach(m => {
      console.log("  -", m.project?.name, "↔", m.oauthProvider?.platform, m.oauthProvider?.pageName);
    });

    // 5. Get all PlatformPosts
    const platformPosts = await prisma.platformPost.findMany({
      where: {
        oauthProvider: {
          userId: dbUser.id,
        },
      },
      include: {
        oauthProvider: {
          select: {
            platform: true,
            pageName: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: 10,
    });

    console.log("📊 PlatformPosts found (showing first 10):", platformPosts.length);
    platformPosts.forEach(p => {
      console.log("  -", p.oauthProvider?.platform, p.oauthProvider?.pageName, "| Date:", p.date, "| Likes:", p.likes, "| Comments:", p.comments);
    });

    // 6. Check for each project if it has linked providers and posts
    const projectAnalytics = await Promise.all(
      projects.map(async (project) => {
        const linkedProviders = oauthProviders.filter(provider =>
          provider.projectToOAuthProviders.some(m => m.projectId === project.id)
        );

        const posts = linkedProviders.flatMap(provider => provider.pagePosts || []);

        return {
          projectId: project.id,
          projectName: project.name,
          linkedProviders: linkedProviders.map(p => ({
            platform: p.platform,
            pageName: p.pageName,
            postsCount: p.pagePosts.length,
          })),
          totalPosts: posts.length,
        };
      })
    );

    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
      },
      projects: projects.map(p => ({ id: p.id, name: p.name })),
      oauthProviders: oauthProviders.map(p => ({
        id: p.id,
        platform: p.platform,
        pageName: p.pageName,
        pageId: p.pageId,
        postsCount: p.pagePosts.length,
        linkedToProjects: p.projectToOAuthProviders.map(m => ({
          projectId: m.projectId,
          projectName: m.project?.name,
        })),
      })),
      mappings: mappings.map(m => ({
        projectId: m.projectId,
        projectName: m.project?.name,
        oauthProviderId: m.oauthProviderId,
        platform: m.oauthProvider?.platform,
        pageName: m.oauthProvider?.pageName,
      })),
      platformPosts: platformPosts.map(p => ({
        id: p.id,
        postId: p.postId,
        date: p.date,
        likes: p.likes,
        comments: p.comments,
        impressions: p.impressions,
        platform: p.oauthProvider?.platform,
        pageName: p.oauthProvider?.pageName,
      })),
      projectAnalytics,
      summary: {
        totalProjects: projects.length,
        totalOAuthProviders: oauthProviders.length,
        totalMappings: mappings.length,
        totalPlatformPosts: await prisma.platformPost.count({
          where: {
            oauthProvider: {
              userId: dbUser.id,
            },
          },
        }),
        projectsWithLinkedProviders: projectAnalytics.filter(p => p.linkedProviders.length > 0).length,
        projectsWithPosts: projectAnalytics.filter(p => p.totalPosts > 0).length,
      },
    });
  })
);

