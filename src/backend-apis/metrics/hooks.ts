import { useQuery } from "@tanstack/react-query";
import {
  fetchRedditPostsData,
  getAllPlatformMetrics,
  getFacebookMetrics,
  getLinkedinMetrics,
  getThreadsMetrics,
  getTiktokMetrics,
} from "./actions";

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

export const useGetFacebookMetrics = (userId: string, projectId: string | null) => {
  return useQuery({
    queryKey: ["facebook-metrics", projectId],
    queryFn: () => getFacebookMetrics(userId, projectId),
    enabled: !!projectId && !!userId,
    refetchOnWindowFocus: false,
  });
};

export const useGetLinkedinMetrics = (userId: string, projectId: string | null) => {
  return useQuery({
    queryKey: ["linkedin-metrics", projectId],
    queryFn: () => getLinkedinMetrics(userId, projectId),
    enabled: !!projectId && !!userId,
    refetchOnWindowFocus: false,
  });
};

export const useGetThreadsMetrics = (userId: string, projectId: string | null) => {
  return useQuery({
    queryKey: ["threads-metrics", projectId],
    queryFn: () => getThreadsMetrics(userId, projectId),
    enabled: !!userId && !!projectId,
  });
};

export const useGetAllPlatformMetrics = (userId: string, selectedProjectId: string | null) => {
  return useQuery({
    queryKey: ["all-metrics", userId, selectedProjectId],
    queryFn: () => getAllPlatformMetrics(userId, selectedProjectId),
    enabled: !!userId && !!selectedProjectId,
  });
};

export const useGetTiktokMetrics = (userId: string, projectId: string | null) => {
  return useQuery({
    queryKey: ["tiktok-metrics", projectId],
    queryFn: () => getTiktokMetrics(userId, projectId),
    enabled: !!projectId && !!userId,
    refetchOnWindowFocus: false,
  });
};