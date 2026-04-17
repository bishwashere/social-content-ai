"use server";

import { runCampaignDayGeneration } from "@/lib/campaign-utils";

export const generateCampaignChat = async (props: {
  projectId: string;
  id: string;
  prompt: string;
  userId: string;
  day: number;
  productRelated: boolean;
}) => {
  return runCampaignDayGeneration({
    projectId: props.projectId,
    campaignId: props.id,
    userId: props.userId,
    day: props.day,
    prompt: props.prompt,
    productRelated: props.productRelated,
  });
};
