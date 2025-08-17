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

export const getFacebookMetrics = async (pageId: string) => {
  const oauthProvider = await prisma.oauthProvider.findFirst({
    where: {
      pageId,
      platform: "facebook",
    },
  });

  if (!oauthProvider) {
    return {
      success: false,
      message: "Facebook page not found",
    };
  }

  const fb = new Fb({
    accessToken: oauthProvider.accessToken,
    refreshToken: oauthProvider.refreshToken!,
  });
  const metrics = await fb.getMyPostInsights(pageId);

  return {
    success: true,
    data: metrics,
  };
};

export const getLinkedinMetrics = async (pageId: string) => {
  try {
    const oauthProvider = await prisma.oauthProvider.findFirst({
      where: {
        pageId,
        platform: "linkedin",
      },
      include: {
        pagePosts: true,
      },
    });

    if (!oauthProvider || !oauthProvider.expiresAt) {
      return {
        success: false,
        message: "Linkedin page not found",
      };
    }

    if (oauthProvider.pagePosts.length) {
      // Reutrn data from db
      return {
        sucess: true,
        data: oauthProvider.pagePosts,
        followersCount: oauthProvider.pageFollowers,
      };
    }

    // Otherwise fetch from linkedin and save to db and return as well
    const l = new Linkedin({
      accessToken: oauthProvider.accessToken,
      expiresAt: oauthProvider.expiresAt,
    });
    const metrics = await l.getMyPostInsights(pageId);

    const followersCount = await l.getFollowersCount(pageId);

    const data = await prisma.oauthProvider.update({
      where: { id: oauthProvider.id },
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

export const getThreadsMetrics = async (userId: string) => {
  try {
    // Step 1: Find the Threads OAuth provider and existing posts
    const oauthProvider = await prisma.oauthProvider.findFirst({
      where: {
        userId,
        platform: "threads",
      },
      include: {
        pagePosts: true,
      },
    });

    if (!oauthProvider) {
      return {
        success: false,
        message: "Threads account not found",
      };
    }

    // Step 2: Return from DB if posts already exist
    if (oauthProvider.pagePosts.length) {
      return {
        success: true,
        data: oauthProvider.pagePosts,
      };
    }

    // Step 3: Fetch from Threads API if not in DB
    const t = new Threads({ accessToken: oauthProvider.accessToken });
    const metrics = await t.fetchUserPostsWithInsights(
      oauthProvider.pageId || ""
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
      where: { id: oauthProvider.id },
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
