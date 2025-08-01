"use server";

import { extractPostId, RedditPostData } from "./hooks";
import { getFacebookPostMetrics, type FacebookMetrics } from "@/lib/facebook";

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

export const fetchFacebookPostMetrics = async (
  urls: string[],
  userId: string
): Promise<FacebookMetrics[] | null> => {
  console.log("Fetching Facebook post metrics for URLs:", urls, userId);
  const results: FacebookMetrics[] = [];
  for (const url of urls) {
    const metrics = await getFacebookPostMetrics(url, userId);
    if (metrics) {
      results.push(metrics);
    }
  }
  return results.length > 0 ? results : [];
};
