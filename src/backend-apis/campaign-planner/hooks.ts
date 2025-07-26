import { CampaignPlanner } from "@/lib/campaign-planner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeCampaignName,
  generateCampaignChat,
  getCampaignPlanner,
  startCampaignPlanner,
} from ".";
import { toast } from "sonner";

export const useCampaignPlanner = () => {
  return useMutation({
    mutationFn: ({
      id,
      projectId,
      campaignName,
      plan,
    }: {
      id?: string;
      projectId: string;
      campaignName: string;
      plan: CampaignPlanner;
    }) => startCampaignPlanner(id, projectId, campaignName, plan),
    onError: () => {
      toast.error("Failed to start campaign planner");
    },
    onSuccess: (data) => {
      if (!data) {
        toast.error("Failed to start campaign planner");
      }
    },
  });
};

export const useGetCampaignPlanner = ({
  projectId,
}: {
  projectId: string;
}) => {
  return useQuery({
    queryFn: () => getCampaignPlanner(projectId),  // must call with only projectId
    enabled: Boolean(projectId),
    queryKey: ["campaignPlanner", projectId],
  });
};


export const useGenerateCampaignChat = () => {
  return useMutation({
    mutationFn: ({
      projectId,
      id,
      prompt,
      userId,
      day,
    }: {
      projectId: string;
      id: string;
      prompt: string;
      userId: string;
      day: string;
    }) =>
      generateCampaignChat({
        projectId,
        id,
        prompt,
        userId,
        day,
      }),
    onError: () => {
      toast.error("Failed to generate campaign chat");
    },
    retry: false,
  });
};

export const useChangeCampaignName = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      changeCampaignName(id, name),

    onSuccess: (projectId: string | boolean) => {
      // variables contains the { id, name } object passed to mutationFn
      if (projectId)
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner", projectId], // Or use projectId if you have it
        });
    },
  });
};

