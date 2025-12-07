import { CampaignPlanner } from "@/lib/campaign-planner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeCampaignData,
  deleteCampaign,
  editChatContent,
  generateCampaignChat,
  getCampaignPlanner,
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

export const useGetCampaignPlanner = ({ projectId }: { projectId: string }) => {
  return useQuery({
    queryFn: () => getCampaignPlanner(projectId), // must call with only projectId
    enabled: Boolean(projectId),
    queryKey: ["campaignPlanner", projectId],
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["session"],
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
    }: {
      id: string;
      name?: string;
      startDate?: Date;
      autoPostEnabled?: boolean;
      autoPostTime?: string;
      autoPostPlatforms?: string[];
      blogNewsMetadata?: { topics: string[]; angles: string[]; webhook: string; platforms?: string[]; timezone?: string };
    }) => changeCampaignData(id, name, startDate, autoPostEnabled, autoPostTime, autoPostPlatforms, blogNewsMetadata),

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
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner"],
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

    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner"],
        });
        queryClient.invalidateQueries({
          queryKey: ["blogFromScheduledPost"],
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
    refetchInterval: 5000, // Refetch every 5 seconds to check for updates from Python
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
    onSuccess: (projectId) => {
      if (projectId)
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner", projectId],
        });
    },
    onError: () => toast.error("Some error occurred!"),
  });
};

export const useDeleteCampaign = () => {
  return useMutation({
    mutationFn: deleteCampaign,
  });
};
