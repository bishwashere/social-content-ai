import { useQuery } from "@tanstack/react-query";
import tryCatchAsync from "@/lib/try-catch-async";
import api from "../axios";
import { ApiError } from "../types";

export type ActionItem = {
  type: "failed_post" | "campaign_content" | "schedule_post";
  icon: string;
  title: string;
  projectId?: string;
  projectName?: string;
  campaignId?: string;
  campaignName?: string;
  day?: number;
  action: string;
  userRole?: string; // "admin" | "editor" | "viewer"
};

export const useGetYourToday = () => {
  return useQuery<ActionItem[]>({
    queryKey: ["yourToday"],
    queryFn: async () => {
      const [err, res] = await tryCatchAsync<ApiError, { data: ActionItem[] }>(async () => {
        const response = await api.get("/your-today");
        return response;
      });
      if (err) {
        console.error("Error fetching your today:", err);
        throw new Error(err.response?.data?.message || "Failed to fetch your today items");
      }
      // The API returns the array directly
      const result = res.data || [];
      console.log("Your Today API response:", result);
      return result;
    },
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

