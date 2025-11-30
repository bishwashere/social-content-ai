import { useQuery } from "@tanstack/react-query";
import tryCatchAsync from "@/lib/try-catch-async";
import api from "../axios";
import { ApiError } from "../types";

export type ActivityItem = {
  type: "posted" | "scheduled_missed" | "draft_ready" | "video_completed";
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

export const useGetRecentActivity = () => {
  return useQuery<ActivityItem[]>({
    queryKey: ["recentActivity"],
    queryFn: async () => {
      const [err, res] = await tryCatchAsync<ApiError, { data: ActivityItem[] }>(async () => {
        const response = await api.get("/recent-activity");
        return response;
      });
      if (err) {
        console.error("Error fetching recent activity:", err);
        throw new Error(err.response?.data?.message || "Failed to fetch recent activity");
      }
      const result = res.data || [];
      console.log("Recent Activity API response:", result);
      return result;
    },
    retry: 1,
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute
  });
};

