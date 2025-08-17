"use server";

import { Fb } from "@/lib/3rd-providers/fb";
import { extractPostId, RedditPostData } from "./hooks";
import { prisma } from "@/lib/prisma";
import { Linkedin } from "@/lib/3rd-providers/linkedin";
import axios from "axios";

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
      }
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
        followersCount: oauthProvider.pageFollowers
      }
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
          create: metrics.map(post => ({
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
      }
    });


    return {
      success: true,
      data: data.pagePosts,
      followersCount: followersCount
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
