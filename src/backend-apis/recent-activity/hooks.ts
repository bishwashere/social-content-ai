import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import tryCatchAsync from "@/lib/try-catch-async";
import api from "../axios";
import { ApiError } from "../types";

export type ActivityType =
  | "posted"
  | "scheduled_missed"
  | "post_failed"
  | "post_scheduled"
  | "draft_ready"
  | "video_completed"
  | "collaborator_joined"
  | "project_created"
  | "campaign_created"
  | "social_connected"
  | "subscription_expiring"
  | "pulse_improved"
  | "post_performing";

export type ActivityItem = {
  type: ActivityType;
  icon: string;
  message: string;
  projectName: string;
  projectId: string;
  timestamp: string;
  platform?: string;
  campaignId?: string;
  day?: number;
  videoId?: string;
};

type ActivityPage = {
  items: ActivityItem[];
  total: number;
  offset: number;
  limit: number;
};

async function fetchActivity(limit: number, offset: number): Promise<ActivityPage> {
  const [err, res] = await tryCatchAsync<ApiError, { data: ActivityPage }>(async () => {
    const response = await api.get(`/recent-activity?limit=${limit}&offset=${offset}`);
    return response;
  });
  if (err) {
    throw new Error(err.response?.data?.message || "Failed to fetch recent activity");
  }
  return res.data;
}

/** Used by the bell dropdown — fetches the 20 most recent notifications. */
export const useGetRecentActivity = () => {
  return useQuery<ActivityItem[]>({
    queryKey: ["recentActivity", "preview"],
    queryFn: async () => {
      const page = await fetchActivity(20, 0);
      return page.items;
    },
    retry: 1,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
};

/** Used by the notifications page — loads 50 at a time with infinite scroll / Load More. */
export const useGetRecentActivityInfinite = () => {
  return useInfiniteQuery<ActivityPage>({
    queryKey: ["recentActivity", "infinite"],
    queryFn: ({ pageParam }) => fetchActivity(50, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });
};
