import { CampaignPlanner } from "@/lib/campaign-planner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getCampaignPlanner, startCampaignPlanner } from ".";
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
  campaignId,
}: {
  projectId: string;
  campaignId: string;
}) => {
  return useQuery({
    queryFn: () => getCampaignPlanner(projectId, campaignId),
    enabled: Boolean(projectId) && Boolean(campaignId),
    queryKey: ["campaignPlanner", projectId, campaignId],
  });
};
