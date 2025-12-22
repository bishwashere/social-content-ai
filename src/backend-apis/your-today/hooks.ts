import { useQuery } from "@tanstack/react-query";
import tryCatchAsync from "@/lib/try-catch-async";
import api from "../axios";
import { ApiError } from "../types";

export type YourTodayProject = {
  projectId: string;
  projectName: string;
  description?: string;
  campaignId?: string;
  campaignName?: string;
  day?: number;
  startDate?: string; // Campaign start date ISO string for calculating actual dates
  userRole?: string; // "admin" | "editor" | "viewer"
  needsAction?: boolean; // true if action button should be shown
  stats?: {
    campaignCount: number;
    publishedPostsCount: number;
    totalImpressions: number;
    recentImpressions: number;
  };
};

export type YourTodayTask = {
  type: "failed_post" | "campaigns" | "schedule_post" | "campaign_ending_soon" | "stuck_blog_news";
  icon: string;
  title: string;
  action: string;
  projects: YourTodayProject[];
};

export const useGetYourToday = () => {
  return useQuery<YourTodayTask[]>({
    queryKey: ["yourToday"],
    queryFn: async () => {
      const [err, res] = await tryCatchAsync<ApiError, { data: YourTodayTask[] }>(async () => {
        const response = await api.get("/your-today");
        return response;
      });
      if (err) {
        console.error("Error fetching your today:", err);
        throw new Error(err.response?.data?.message || "Failed to fetch your today items");
      }
      const result = res.data || [];
      console.log("Your Today API response:", result);
      return result;
    },
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

