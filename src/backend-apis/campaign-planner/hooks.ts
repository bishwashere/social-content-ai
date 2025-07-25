import { CampaignPlanner } from "@/lib/campaign-planner";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  generateCampaignChat,
  getCampaignPlanner,
  startCampaignPlanner,
} from ".";
import { toast } from "sonner";

export const useCampaignPlanner = () => {
  return useMutation({
    mutationFn: ({
      projectId,
      plan,
    }: {
      projectId: string;
      plan: CampaignPlanner;
    }) => startCampaignPlanner(projectId, plan),
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
      campaignId,
      prompt,
      userId,
      day,
    }: {
      projectId: string;
      campaignId: string;
      prompt: string;
      userId: string;
      day: string;
    }) =>
      generateCampaignChat({
        projectId,
        campaignId,
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
