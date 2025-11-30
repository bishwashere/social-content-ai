import { useQuery } from "@tanstack/react-query";
import tryCatchAsync from "@/lib/try-catch-async";
import api from "../axios";
import { ApiError } from "../types";

export type PendingTaskProject = {
  projectId: string;
  projectName: string;
  description?: string;
  campaignId?: string;
  campaignName?: string;
  userRole?: string; // "admin" | "editor" | "viewer"
};

export type PendingTask = {
  type: "no_content_next_week" | "campaign_expiring" | "low_posting_frequency" | "missing_templates";
  icon: string;
  title: string;
  action: string;
  projects: PendingTaskProject[];
};

export const useGetPendingTasks = () => {
  return useQuery<PendingTask[]>({
    queryKey: ["pendingTasks"],
    queryFn: async () => {
      const [err, res] = await tryCatchAsync<ApiError, { data: PendingTask[] }>(async () => {
        const response = await api.get("/pending-tasks");
        return response;
      });
      if (err) {
        console.error("Error fetching pending tasks:", err);
        throw new Error(err.response?.data?.message || "Failed to fetch pending tasks");
      }
      const result = res.data || [];
      return result;
    },
    retry: 1,
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute
  });
};

