import { CampaignPlanner } from "@/lib/campaign-planner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeCampaignData,
  deleteCampaign,
  editChatContent,
  generateCampaignChat,
  getCampaignPlanner,
  scheduleCampaignPosts,
  startCampaignPlanner,
  toggleMarkAsComplete,
  toggleTickMark,
} from ".";
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
    }: {
      id?: string;
      projectId: string;
      campaignName: string;
      plan: CampaignPlanner;
      platforms?: string[];
    }) =>
      startCampaignPlanner(
        id,
        projectId,
        campaignName,
        plan,
        session?.user.id as string,
        platforms || []
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
    }: {
      id: string;
      name?: string;
      startDate?: Date;
      autoPostEnabled?: boolean;
      autoPostTime?: string;
      autoPostPlatforms?: string[];
    }) => changeCampaignData(id, name, startDate, autoPostEnabled, autoPostTime, autoPostPlatforms),

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
      platforms,
    }: {
      campaignId: string;
      projectId: string;
      autoPostTime: string;
      platforms: string[];
    }) => scheduleCampaignPosts({ campaignId, projectId, autoPostTime, platforms }),

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
