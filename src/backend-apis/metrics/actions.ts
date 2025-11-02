"use server";

import { Fb } from "@/lib/3rd-providers/fb";
import { extractPostId, RedditPostData } from "./hooks";
import { prisma } from "@/lib/prisma";
import { Linkedin } from "@/lib/3rd-providers/linkedin";
import axios from "axios";
import { Threads } from "@/lib/3rd-providers/threads";

export const fetchRedditPostsData = async (
  urls: string[]
): Promise<RedditPostData[]> => {
  const results: RedditPostData[] = [];

  for (const url of urls) {
    const postId = extractPostId(url);
    if (!postId) continue;

    const res = await fetch(`https://www.reddit.com/comments/${postId}.json`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SocialContentAI/1.0)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.log(
        "Error fetching Reddit post data",
        res.status,
        res.statusText,
        await res.text()
      );
      continue;
    }

    const data = await res.json();
    const post = data?.[0]?.data?.children?.[0]?.data;

    if (post) {
      results.push({
        url,
        title: post.title,
        upvotes: post.ups,
        comments: post.num_comments,
        date: new Date(post.created_utc * 1000).toISOString(),
      });
    }
  }

  return results;
};

export const getFacebookMetrics = async (userId: string, projectId: string | null) => {
  try {
    // Step 1: Find OAuth provider and existing posts
    const oauthProvider = await prisma.oauthProvider.findMany({
      where: {
        userId,
        platform: "facebook",
      },
      include: {
        pagePosts: true,
        projectToOAuthProviders: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!oauthProvider.length) {
      return {
        success: false,
        message: "Facebook page not found",
      };
    }

    // Step 2: Return from DB if posts already exist
    const projectOauthProvider = oauthProvider.filter(provider => provider.projectToOAuthProviders.some(data => data.projectId === projectId))
    const posts = projectOauthProvider.flatMap(provider => provider.pagePosts || []);
    if (posts.length) {
      return {
        success: true,
        data: posts,
      };
    }

    if(!projectOauthProvider[0].pageId) {
      return {
        success: false,
        message: "Facebook page not found",
      };
    }

    // Step 3: Fetch from Facebook API
    const fb = new Fb({
      accessToken: projectOauthProvider[0].accessToken,
      refreshToken: projectOauthProvider[0].refreshToken!,
    });
    const metrics = await fb.getMyPostInsights(projectOauthProvider[0].pageId);

    // Step 4: Map API response to DB structure with insights
    const postsToSave = metrics.map((post) => {
      const postData = {
        postId: post.id,
        content: post.message || "No message",
        date: new Date(post.date),
        shares: post.shares || 0,
        likes: post.reactions || 0,
        comments: post.comments || 0,
        impressions: post.impressions,
        uniqueImpressions: post.uniqueImpressions,
        // Include insights if we have additional metadata
        insights: (post.postType || post.permalinkUrl || post.fullPictureUrl || post.linkUrl || post.story) ? {
          create: {
            postType: post.postType || null,
            permalinkUrl: post.permalinkUrl || null,
            fullPictureUrl: post.fullPictureUrl || null,
            linkUrl: post.linkUrl || null,
            story: post.story || null,
            // Reaction breakdowns and detailed insights will be fetched separately
            // to avoid blocking the main flow
          },
        } : undefined,
      };
      // Remove insights if undefined to avoid Prisma errors
      if (!postData.insights) {
        delete (postData as any).insights;
      }
      return postData;
    });

    // Step 5: Save to DB
    const data = await prisma.oauthProvider.update({
      where: { id: projectOauthProvider[0].id },
      data: {
        pagePosts: {
          create: postsToSave,
        },
      },
      include: {
        pagePosts: {
          include: {
            insights: true,
          },
        },
      },
    });

    // Step 6: Fetch detailed insights asynchronously (don't block response)
    // This includes: engaged users, clicks, negative feedback, reach, reaction breakdowns
    // We do this in the background so it doesn't slow down the main request
    Promise.all(
      data.pagePosts.map(async (savedPost) => {
        try {
          // Find the corresponding metric to get metadata we already fetched
          const metric = metrics.find((m) => m.id === savedPost.postId);
          
          // Fetch detailed insights and reaction breakdowns
          const [detailedInsights, reactionBreakdown] = await Promise.all([
            fb.getPostDetailedInsights(savedPost.postId),
            fb.getPostReactionBreakdown(savedPost.postId),
          ]);

          // Upsert insights with all data (create if doesn't exist, update if it does)
          await prisma.postInsights.upsert({
            where: { platformPostId: savedPost.id },
            create: {
              platformPostId: savedPost.id,
              postType: metric?.postType || null,
              permalinkUrl: metric?.permalinkUrl || null,
              fullPictureUrl: metric?.fullPictureUrl || null,
              linkUrl: metric?.linkUrl || null,
              story: metric?.story || null,
              engagedUsers: detailedInsights.engagedUsers || null,
              postClicks: detailedInsights.postClicks || null,
              negativeFeedback: detailedInsights.negativeFeedback || null,
              postReach: detailedInsights.postReach || null,
              reactionsLike: reactionBreakdown.like || null,
              reactionsLove: reactionBreakdown.love || null,
              reactionsWow: reactionBreakdown.wow || null,
              reactionsHaha: reactionBreakdown.haha || null,
              reactionsSorry: reactionBreakdown.sorry || null,
              reactionsAnger: reactionBreakdown.anger || null,
            },
            update: {
              // Update metadata if not already set
              postType: metric?.postType || undefined,
              permalinkUrl: metric?.permalinkUrl || undefined,
              fullPictureUrl: metric?.fullPictureUrl || undefined,
              linkUrl: metric?.linkUrl || undefined,
              story: metric?.story || undefined,
              // Always update detailed insights
              engagedUsers: detailedInsights.engagedUsers || null,
              postClicks: detailedInsights.postClicks || null,
              negativeFeedback: detailedInsights.negativeFeedback || null,
              postReach: detailedInsights.postReach || null,
              reactionsLike: reactionBreakdown.like || null,
              reactionsLove: reactionBreakdown.love || null,
              reactionsWow: reactionBreakdown.wow || null,
              reactionsHaha: reactionBreakdown.haha || null,
              reactionsSorry: reactionBreakdown.sorry || null,
              reactionsAnger: reactionBreakdown.anger || null,
              updatedAt: new Date(),
            },
          });
        } catch (error) {
          // Silently fail - insights fetching is optional
          console.warn(`Failed to fetch detailed insights for post ${savedPost.postId}:`, error);
        }
      })
    ).catch((error) => {
      // Don't throw - this is background processing
      console.warn("Error fetching detailed insights in background:", error);
    });

    return {
      success: true,
      data: data.pagePosts,
    };
  } catch (error) {
    console.error("Error fetching Facebook metrics:", error);
    throw new Error("Could not load Facebook data!");
  }
};

export const getLinkedinMetrics = async (userId: string, projectId: string | null) => {
  try {
    const oauthProvider = await prisma.oauthProvider.findMany({
      where: {
        userId,
        platform: "linkedin",
      },
      include: {
        pagePosts: true,
        projectToOAuthProviders: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    const projectOauthProvider = oauthProvider.filter(provider => provider.projectToOAuthProviders.some(data => data.projectId === projectId))

    if (!projectOauthProvider.length || !projectOauthProvider[0].pageId || !projectOauthProvider[0].expiresAt) {
      return {
        success: false,
        message: "Linkedin page not found",
      };
    }

    const posts = projectOauthProvider.flatMap(provider => provider.pagePosts || []);
    if (posts.length) {
      // Reutrn data from db
      return {
        sucess: true,
        data: posts,
        followersCount: projectOauthProvider[0].pageFollowers,
      };
    }

    // Otherwise fetch from linkedin and save to db and return as well
    const l = new Linkedin({
      accessToken: projectOauthProvider[0].accessToken,
      expiresAt: projectOauthProvider[0].expiresAt,
    });
    const metrics = await l.getMyPostInsights(projectOauthProvider[0].pageId);

    const followersCount = await l.getFollowersCount(projectOauthProvider[0].pageId);

    const data = await prisma.oauthProvider.update({
      where: { id: projectOauthProvider[0].id },
      data: {
        pageFollowers: followersCount,
        pagePosts: {
          create: metrics.map((post) => ({
            postId: post.postId,
            content: post.content,
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
            impressions: post.impressions,
            uniqueImpressions: post.uniqueImpressions,
            date: post.date,
          })),
        },
      },
      include: {
        pagePosts: true,
      },
    });

    return {
      success: true,
      data: data.pagePosts,
      followersCount: followersCount,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      console.error("Axios error:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      throw new Error("API call limit reached for today !");
    } else {
      throw new Error("Couldnot load linkedin data !");
    }
  }
};

export const getThreadsMetrics = async (userId: string, projectId: string | null) => {
  try {
    // Step 1: Find the Threads OAuth provider and existing posts
    const oauthProvider = await prisma.oauthProvider.findMany({
      where: {
        userId,
        platform: "threads",
      },
      include: {
        pagePosts: true,
        projectToOAuthProviders: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    const projectOauthProvider = oauthProvider.filter(provider => provider.projectToOAuthProviders.some(data => data.projectId === projectId))

    if (!oauthProvider.length) {
      return {
        success: false,
        message: "Threads account not found",
      };
    }

    // Step 2: Return from DB if posts already exist
    const posts = projectOauthProvider.flatMap(provider => provider.pagePosts || []);
    if (posts.length) {
      return {
        success: true,
        data: posts,
      };
    }

    // Step 3: Fetch from Threads API if not in DB
    const t = new Threads({ accessToken: projectOauthProvider[0].accessToken });
    const metrics = await t.fetchUserPostsWithInsights(
      projectOauthProvider[0].pageId || ""
    );

    // Step 4: Transform metrics to match DB structure
    const postsToSave = metrics.map((post) => ({
      postId: post.postId,
      content: post.content,
      likes: post.insights.likesCount,
      comments: post.insights.repliesCount,
      shares: 0, // Threads API do not have shares
      impressions: post.insights.viewsCount,
      uniqueImpressions: post.insights.viewsCount,
      date: new Date(post.date),
    }));

    // Step 5: Save to DB
    const data = await prisma.oauthProvider.update({
      where: { id: projectOauthProvider[0].id },
      data: {
        pagePosts: {
          create: postsToSave,
        },
      },
      include: {
        pagePosts: true,
      },
    });

    return {
      success: true,
      data: data.pagePosts,
    };
  } catch (error) {
    console.error("Error fetching Threads metrics:", error);
    throw new Error("Could not load Threads data!");
  }
};

export const getAllPlatformMetrics = async (userId: string, projectId: string | null) => {
  try {
    // console.log(userId)
    const oauthProvider = await prisma.oauthProvider.findMany({
      where: {
        userId,
      },
      include: {
        pagePosts: true,
        projectToOAuthProviders: true,
      },
    });
    // console.log(oauthProvider)

    if (!oauthProvider) {
      return {
        success: false,
        message: "Account not found",
      };
    }

    const posts = oauthProvider
      .filter(provider => provider.projectToOAuthProviders.some(data => data.projectId === projectId))
      .flatMap(provider => provider.pagePosts || []);

    return {
      success: true,
      data: posts,
    };
  } catch (error) {
    console.error("Error fetching metrics:", error);
    throw new Error("Could not load data!");
  }
}