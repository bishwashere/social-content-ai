import { useQuery } from "@tanstack/react-query";
import { fetchRedditPostsData, fetchFacebookPostMetrics } from "./actions";
import { useSession } from "../auth/hooks";

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
  return useQuery({
    queryKey: ["reddit-posts", urls],
    queryFn: () => fetchRedditPostsData(urls),
    enabled: urls?.length > 0,
  });
};

export const useFacebookPostMetrics = ({
  urls,
  userId,
}: {
  urls: string[];
  userId: string;
}) => {
  console.log("Fetching Facebook post metrics for URLs:", urls, userId);
  const facebookUrls = urls?.filter((url) => url.includes("facebook.com"));
  return useQuery({
    queryKey: ["facebook-metrics", facebookUrls, userId],
    queryFn: () => fetchFacebookPostMetrics(facebookUrls, userId),
    enabled: facebookUrls?.length > 0 && !!userId,
  });
};
