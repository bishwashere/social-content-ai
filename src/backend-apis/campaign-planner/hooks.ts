import { CampaignPlanner } from "@/lib/campaign-planner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  changeCampaignData,
  deleteCampaign,
  editChatContent,
  generateCampaignChat,
  getCampaignPlanner,
  getCampaignPlannerMetadata,
  getOldCampaigns,
  getCampaignChats,
  scheduleCampaignPosts,
  scheduleCampaignTasks,
  startCampaignPlanner,
  toggleMarkAsComplete,
  toggleTickMark,
} from ".";
import { generateBlogNewsContent, retrySendBlogToWebhook } from "./blog-news";
import { toast } from "sonner";
import { useSession } from "../auth/hooks";

export const useCampaignPlanner = () => {
  const { data: session } = useSession();
  return useMutation({
    mutationFn: ({
      id,
      projectId,
      campaignName,
      plan,
      platforms,
      blogNewsMetadata,
    }: {
      id?: string;
      projectId: string;
      campaignName: string;
      plan: CampaignPlanner;
      platforms?: string[];
      blogNewsMetadata?: { topics: string[]; angles: string[]; webhook: string; platforms?: string[]; targetAudience?: string; productRelated?: boolean };
    }) =>
      startCampaignPlanner(
        id,
        projectId,
        campaignName,
        plan,
        session?.user.id as string,
        platforms || [],
        blogNewsMetadata
      ),
    onSuccess: (data) => {
      if (data.success) {
        // queryClient.invalidateQueries({
        //   queryKey: ["session"],
        // });
      } else {
        toast.error(data.message);
      }
    },
    onError: (err) => {
      toast.error(err?.message ?? "Failed to start campaign planner");
    },
  });
};

export const useGetCampaignPlanner = ({ 
  projectId, 
  loadChats = false,
  limit 
}: { 
  projectId: string;
  loadChats?: boolean; // If true, loads full data with chats. If false, loads only metadata
  limit?: number; // Limit number of campaigns to load (for metadata mode)
}) => {
  const queryClient = useQueryClient();
  
  // Ensure projectId is a valid non-empty string before enabling query
  const isValidProjectId = Boolean(projectId && typeof projectId === 'string' && projectId.trim().length > 0);
  
  // Clear all campaign planner queries when projectId changes (like a refresh)
  // This ensures we start fresh when switching projects
  useEffect(() => {
    if (isValidProjectId) {
      // Cancel all pending campaign planner queries
      queryClient.cancelQueries({
        queryKey: ["campaignPlanner"],
        exact: false, // Cancel all queries that start with "campaignPlanner"
      });
      
      // Remove all campaign planner queries from cache
      queryClient.removeQueries({
        queryKey: ["campaignPlanner"],
        exact: false,
      });
      
      console.log(`[useGetCampaignPlanner] Cleared all campaign planner queries for new project: ${projectId}`);
    }
  }, [projectId, queryClient, isValidProjectId]);
  
  return useQuery({
    queryFn: async ({ signal }) => {
      console.log(`[useGetCampaignPlanner] Query function START - projectId: ${projectId}, loadChats: ${loadChats}, limit: ${limit}`);
      
      // Check if query was cancelled
      if (signal?.aborted) {
        console.log(`[useGetCampaignPlanner] Query cancelled before execution`);
        throw new Error("Query cancelled");
      }
      
      try {
        console.log(`[useGetCampaignPlanner] About to call server function...`);
        const startTime = Date.now();
        
        let result;
        if (loadChats) {
          result = await getCampaignPlanner(projectId);
        } else {
          // Use API route instead of server action for better reliability
          const response = await fetch(`/api/campaign-planner/metadata?projectId=${encodeURIComponent(projectId)}${limit ? `&limit=${limit}` : ''}`);
          if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
          }
          result = await response.json();
        }
        
        // Check again if cancelled during execution
        if (signal?.aborted) {
          console.log(`[useGetCampaignPlanner] Query cancelled during execution`);
          throw new Error("Query cancelled");
        }
        
        const duration = Date.now() - startTime;
        console.log(`[useGetCampaignPlanner] Server function completed in ${duration}ms`);
        console.log(`[useGetCampaignPlanner] Query function SUCCESS - projectId: ${projectId}, result:`, {
          hasData: !!result,
          campaignsCount: result?.chatsGroupedByCampaign?.length || 0,
        });
        return result;
      } catch (error) {
        // Don't log cancellation errors as errors
        if (error instanceof Error && error.message === "Query cancelled") {
          console.log(`[useGetCampaignPlanner] Query was cancelled for projectId: ${projectId}`);
          throw error;
        }
        
        console.error(`[useGetCampaignPlanner] Query function ERROR - projectId: ${projectId}:`, error);
        console.error(`[useGetCampaignPlanner] Error details:`, {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },
    enabled: isValidProjectId, // Only enable when we have a valid projectId
    queryKey: ["campaignPlanner", projectId, loadChats, limit],
    staleTime: 0, // Always consider data stale - fetch fresh on project switch
    refetchOnWindowFocus: false, // Don't refetch on window focus
    gcTime: 0, // Don't cache old project data
    retry: 1, // Retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
    // Add retry condition to not retry cancelled queries
    retryOnMount: true,
  });
};

// Hook to load chats for a specific campaign on demand
export const useGetCampaignChats = (campaignId: string | undefined) => {
  return useQuery({
    queryFn: () => getCampaignChats(campaignId!),
    enabled: Boolean(campaignId),
    queryKey: ["campaignChats", campaignId],
  });
};

// Hook to load old campaigns on demand
export const useGetOldCampaigns = (projectId: string | undefined, enabled: boolean = false) => {
  return useQuery({
    queryFn: () => getOldCampaigns(projectId!),
    enabled: Boolean(projectId) && enabled,
    queryKey: ["oldCampaigns", projectId],
  });
};

export const useGenerateCampaignChat = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: ({
      projectId,
      id,
      prompt,
      day,
      productRelated,
    }: {
      projectId: string;
      id: string;
      prompt: string;
      day: number;
      productRelated: boolean;
    }) =>
      generateCampaignChat({
        projectId,
        id,
        prompt,
        userId: session?.user?.id as string,
        day,
        productRelated,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["session"],
      });
      // Invalidate campaign planner queries to ensure fresh data is fetched
      queryClient.invalidateQueries({
        queryKey: ["campaignPlanner", variables.projectId],
      });
    },
    onError: () => {
      toast.error("Failed to generate campaign chat");
    },
    retry: false,
  });
};

export const useChangeCampaignData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      name,
      startDate,
      autoPostEnabled,
      autoPostTime,
      autoPostPlatforms,
      blogNewsMetadata,
      repeatNextMonth,
    }: {
      id: string;
      name?: string;
      startDate?: Date;
      autoPostEnabled?: boolean;
      autoPostTime?: string;
      autoPostPlatforms?: string[];
      blogNewsMetadata?: { topics: string[]; angles: string[]; webhook: string; platforms?: string[]; timezone?: string };
      repeatNextMonth?: boolean;
    }) => changeCampaignData(id, name, startDate, autoPostEnabled, autoPostTime, autoPostPlatforms, blogNewsMetadata, repeatNextMonth),

    onSuccess: (projectId: string | boolean) => {
      if (projectId)
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner", projectId],
        });
    },
  });
};

export const useScheduleCampaignPosts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      projectId,
      autoPostTime,
      timezone,
      platforms,
    }: {
      campaignId: string;
      projectId: string;
      autoPostTime: string;
      timezone?: string;
      platforms: string[];
    }) => scheduleCampaignPosts({ campaignId, projectId, autoPostTime, timezone, platforms }),

    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(`Successfully scheduled ${result.scheduledCount} posts`);
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner", variables.projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ["scheduledPosts"],
        });
      } else {
        if (result.errors.length > 0) {
          toast.error(result.errors[0]);
        } else {
          toast.error("Failed to schedule some posts");
        }
      }
    },
    onError: () => {
      toast.error("Failed to schedule campaign posts");
    },
  });
};

export const useScheduleCampaignTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      projectId,
      autoPostTime,
      timezone,
      platforms,
    }: {
      campaignId: string;
      projectId: string;
      autoPostTime: string;
      timezone?: string;
      platforms: string[];
    }) => scheduleCampaignTasks({ campaignId, projectId, autoPostTime, timezone, platforms }),

    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(`Successfully scheduled ${result.scheduledCount} tasks`);
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner", variables.projectId],
        });
      } else {
        if (result.errors.length > 0) {
          toast.error(result.errors[0]);
        } else {
          toast.error("Failed to schedule some tasks");
        }
      }
    },
    onError: () => {
      toast.error("Failed to schedule campaign tasks");
    },
  });
};

export const useGenerateBlogNewsContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      day,
      topics,
      angles,
      webhook,
    }: {
      campaignId: string;
      day: number;
      topics: string[];
      angles: string[];
      webhook: string;
    }) => generateBlogNewsContent({ campaignId, day, topics, angles, webhook }),

    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(result.message);
        // Only invalidate the specific blog query instead of all campaign planner queries
        queryClient.invalidateQueries({
          queryKey: ["blogFromScheduledPost", variables.campaignId, variables.day],
        });
        queryClient.invalidateQueries({
          queryKey: ["session"],
        });
      } else {
        toast.error(result.message || "Failed to generate blog content");
        // Note: insufficientCoins handling should be done in the component
        // by checking result.insufficientCoins and showing pricing modal
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate blog content");
    },
  });
};

export const useRetryWebhook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      webhook,
      blog,
      day,
      campaignId,
    }: {
      webhook: string;
      blog: {
        title: string;
        content: string;
        tags: string[];
        sourceArticle?: any;
      };
      day: number;
      campaignId: string;
    }) => {
      // Call server action that handles both webhook sending and database update
      const result = await retrySendBlogToWebhook({
        webhook,
        blog,
        day,
        campaignId,
      });
      return result;
    },

    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(result.message);
        // Only invalidate the specific blog query instead of all campaign planner queries
        queryClient.invalidateQueries({
          queryKey: ["blogFromScheduledPost", variables.campaignId, variables.day],
        });
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send blog to webhook");
    },
  });
};

/**
 * Hook to get blog from ScheduledPost for a campaign day
 * This fetches from where Python saves the blog (ScheduledPost.meta.blog)
 */
export const useBlogFromScheduledPost = (campaignId: string | undefined, day: number | undefined) => {
  return useQuery({
    queryKey: ["blogFromScheduledPost", campaignId, day],
    queryFn: async () => {
      if (!campaignId || !day) return null;
      const { getBlogFromScheduledPost } = await import("@/backend-apis/campaign-planner/blog-news");
      return getBlogFromScheduledPost(campaignId, day);
    },
    enabled: !!campaignId && !!day,
    // Only refetch when blog is not complete (allStepsComplete is false)
    // This prevents infinite calls once the blog generation is complete
    refetchInterval: (query) => {
      const data = query.state.data as { allStepsComplete?: boolean } | null;
      // Stop polling once all steps are complete
      return data?.allStepsComplete === true ? false : 5000;
    },
  });
};

export const useToggleMarkAsComplete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleMarkAsComplete,
    onSuccess: (projectId) => {
      if (projectId)
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner", projectId],
        });
    },
  });
};

export const useToggleTickMark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleTickMark,
    onSuccess: (projectId) => {
      if (projectId)
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner", projectId],
        });
    },
    onError: () => toast.error("Some error occurred!"),
  });
};

export const useEditChatContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editChatContent,
    onSuccess: (result) => {
      if (result) {
        const { projectId, campaignId } = result;
        // Invalidate campaign planner query
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner", projectId],
        });
        // Invalidate campaign chats query - this is crucial for showing the media after save
        queryClient.invalidateQueries({
          queryKey: ["campaignChats", campaignId],
        });
        // Also invalidate scheduled posts since we might be editing a scheduled post
        queryClient.invalidateQueries({
          queryKey: ["scheduledPosts"],
        });
      }
    },
    onError: () => toast.error("Some error occurred!"),
  });
};

export const useDeleteCampaign = () => {
  return useMutation({
    mutationFn: deleteCampaign,
  });
};
