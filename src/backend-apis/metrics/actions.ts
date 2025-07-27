"use server";

import { extractPostId, RedditPostData } from "./hooks";

export const fetchRedditPostsData = async (
  urls: string[]
): Promise<RedditPostData[]> => {
  const results: RedditPostData[] = [];

  for (const url of urls) {
    const postId = extractPostId(url);
    if (!postId) continue;

    const res = await fetch(`https://www.reddit.com/comments/${postId}.json`);
    if (!res.ok) continue;

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
