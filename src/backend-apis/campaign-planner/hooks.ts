import { CampaignPlanner } from "@/lib/campaign-planner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeCampaignData,
  generateCampaignChat,
  getCampaignPlanner,
  startCampaignPlanner,
  toggleMarkAsComplete,
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
    }: {
      id?: string;
      projectId: string;
      campaignName: string;
      plan: CampaignPlanner;
    }) =>
      startCampaignPlanner(
        id,
        projectId,
        campaignName,
        plan,
        session?.user._id as string
      ),
    onError: (err) => {
      toast.error(err?.message ?? "Failed to start campaign planner");
    },
    onSuccess: (data) => {
      if (
        typeof data === "object" &&
        "message" in data &&
        "success" in data &&
        data.success === false
      ) {
        toast.error(data.message);
      }
      if (!data) {
        toast.error("Failed to start campaign planner");
      }
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
      day: number;
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

export const useChangeCampaignData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name, startDate }: { id: string; name?: string, startDate?: Date }) =>
      changeCampaignData(id, name, startDate),

    onSuccess: (projectId: string | boolean) => {
      // variables contains the { id, name } object passed to mutationFn
      if (projectId)
        queryClient.invalidateQueries({
          queryKey: ["campaignPlanner", projectId], // Or use projectId if you have it
        });
    },
  });
};

export const useToggleMarkAsComplete = () => {
  return useMutation({
    mutationFn: toggleMarkAsComplete,
  });
};
