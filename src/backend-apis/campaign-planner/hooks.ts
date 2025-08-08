import { CampaignPlanner } from "@/lib/campaign-planner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeCampaignData,
  deleteCampaign,
  editChatContent,
  generateCampaignChat,
  getCampaignPlanner,
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
        platforms
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
    }: {
      projectId: string;
      id: string;
      prompt: string;
      day: number;
    }) =>
      generateCampaignChat({
        projectId,
        id,
        prompt,
        userId: session?.user?.id as string,
        day,
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
    }: {
      id: string;
      name?: string;
      startDate?: Date;
    }) => changeCampaignData(id, name, startDate),

    onSuccess: (projectId: string | boolean) => {
      if (projectId)
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner", projectId],
        });
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
