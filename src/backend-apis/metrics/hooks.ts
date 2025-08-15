import { useQuery } from "@tanstack/react-query";
import { fetchRedditPostsData, getFacebookMetrics, getLinkedinMetrics } from "./actions";

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

export const useGetFacebookMetrics = (pageId: string) => {
  return useQuery({
    queryKey: ["facebook-metrics", pageId],
    queryFn: () => getFacebookMetrics(pageId),
    enabled: !!pageId,
  });
};

export const useGetLinkedinMetrics = (pageId: string) => {
  return useQuery({
    queryKey: ["linkedin-metrics", pageId],
    queryFn: () => getLinkedinMetrics(pageId),
    enabled: !!pageId,
    refetchOnWindowFocus: false,
  });
};
