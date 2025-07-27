import { useQuery } from "@tanstack/react-query";
import { fetchRedditPostsData } from "./actions";

export type RedditPostData = {
  url: string;
  title: string;
  upvotes: number;
  comments: number;
  date: string;
};

export const extractPostId = (url: string): string | null => {
  const match = url.match(/\/comments\/([a-z0-9]+)/i);
  return match ? match[1] : null;
};

export const useRedditPostsData = (urls: string[]) => {
  console.log("urls", urls);
  return useQuery({
    queryKey: ["reddit-posts", urls],
    queryFn: () => fetchRedditPostsData(urls),
    enabled: urls?.length > 0,
  });
};
