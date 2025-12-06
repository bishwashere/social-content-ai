import { useQuery } from "@tanstack/react-query";
import tryCatchAsync from "@/lib/try-catch-async";
import api from "../axios";
import { ApiError } from "../types";

export type Achievements = {
  projectsWithCampaigns: number;
  projectsWithScheduledPosts: number;
  projectsWithVideos: number;
  projectsWithTracking: number;
};

export function useGetAchievements() {
  return useQuery<Achievements>({
    queryKey: ["achievements"],
    queryFn: async () => {
      const [err, res] = await tryCatchAsync<ApiError, { data: { data: Achievements } }>(async () => {
        const response = await api.get("/achievements");
        return response;
      });
      if (err) {
        console.error("Error fetching achievements:", err);
        console.error("Error details:", err.response?.data);
        throw new Error(err.response?.data?.message || "Failed to fetch achievements");
      }
      // sendNextResponse wraps data in { status, data, message }
      // So response.data = { status, data: Achievements, message }
      // We need response.data.data to get the Achievements
      const result = res.data?.data || {
        projectsWithCampaigns: 0,
        projectsWithScheduledPosts: 0,
        projectsWithVideos: 0,
        projectsWithTracking: 0,
      };
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

