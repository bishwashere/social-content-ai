"use server";

import { UserModel } from "@/db/auth/schema/user";
import { CampaignPlannerModel } from "@/db/projects/schema/campaign-planner";
import { ProjectModel } from "@/db/projects/schema/project";
import { AI } from "@/lib/ai";
import { CampaignPlanner } from "@/lib/campaign-planner";

/**
 *Create a campaign planner, update if already exits
 */
export const startCampaignPlanner = async (
  projectId: string,
  plan: CampaignPlanner
) => {
  const existingPlanner = await CampaignPlannerModel.findOne({
    projectId,
    campaignId: plan.id,
  });

  // delete if exists
  if (existingPlanner) {
    await CampaignPlannerModel.deleteOne({
      projectId,
      campaignId: plan.id,
    });
  }

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

export const generateCampaignChat = async (props: {
  projectId: string;
  campaignId: string;
  prompt: string;
  userId: string;
  day: string;
}) => {
  const project = await ProjectModel.findById(props.projectId);
  const projectCampaign = await CampaignPlannerModel.findOne({
    projectId: props.projectId,
    campaignId: props.campaignId,
  });

  if (!projectCampaign) {
    return {
      success: false,
      message: "Campaign not found",
    };
  }

  if (!project) {
    return {
      success: false,
      message: "Project not found",
    };
  }

  const ai = new AI();

  const chatFromAI = await ai.generateContent({
    userPrompt: props.prompt || "",
    projectDescription: project.description,
    projectName: project.name,
    projectId: props.projectId || "",
    projectRelated: true,
  });

  console.log("CHAT FROM AI: ", chatFromAI);

  if (!chatFromAI) {
    return {
      success: false,
      message: "Failed to generate content",
    };
  }

  const updatedChats = projectCampaign.chats.map((chat: any) => {
    if (chat.day === props.day) {
      return {
        ...chat,
        contents: chatFromAI,
        status: "generated",
      };
    }
    return chat;
  });

  projectCampaign.chats = updatedChats;
  await projectCampaign.save();

  return {
    success: true,
  };
};
