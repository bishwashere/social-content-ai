"use server";

import { CampaignPlannerModel } from "@/db/projects/schema/campaign-planner";
import { CampaignPlanner } from "@/lib/campaign-planner";

/**
 *Create a campaign planner, update if already exits
 */
export const startCampaignPlanner = async (
  projectId: string,
  plan: CampaignPlanner
) => {
  const planner = await CampaignPlannerModel.findOneAndUpdate(
    { projectId, campaignId: plan.id },
    {
      $set: {
        campaignId: plan.id,
        goal: plan.title,
        projectId,
        chats: plan.data.map((d) => ({
          title: d.task,
          day: d.day,
          prompt: "",
          campaignTitle: d.task,
          status: "pending",
          contents: [],
        })),
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  return planner.toObject();
};

export const getCampaignPlanner = async (
  projectId: string,
  campaignId: string
) => {
  const planner = await CampaignPlannerModel.findOne({ projectId, campaignId });
  return planner?.toObject();
};
