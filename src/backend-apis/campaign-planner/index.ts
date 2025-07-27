"use server";

import { UserModel } from "@/db/auth/schema/user";
import connectToDb from "@/db/connect";
import {
  CampaignPlannerModel,
  CampaignPlannerType,
} from "@/db/projects/schema/campaign-planner";
import { ProjectModel } from "@/db/projects/schema/project";
import { AI } from "@/lib/ai";
import { CampaignPlanner } from "@/lib/campaign-planner";

/**
 *Create a campaign planner, update if already exits
 */
export const startCampaignPlanner = async (
  id: string | undefined,
  projectId: string,
  campaignName: string,
  plan: CampaignPlanner,
  userId: string
) => {
  await connectToDb();
  // const existingPlanner = await CampaignPlannerModel.findOne({
  //   projectId,
  //   campaignId: plan.id,
  // });

  // // delete if exists
  // if (existingPlanner) {
  //   await CampaignPlannerModel.deleteOne({
  //     projectId,
  //     campaignId: plan.id,
  //   });
  // }

  const user = await UserModel.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.remainingChatGenerations < 10) {
    return {
      success: false,
      message: "You have not enough chat generations left.",
    };
  }
  user.remainingChatGenerations -= 10;
  await user.save();

  if (id) {
    const planner = await CampaignPlannerModel.findOneAndUpdate(
      { _id: id },
      {
        $set: {
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

    return planner ? JSON.parse(JSON.stringify(planner)) : null;
  }
  const planner = await CampaignPlannerModel.create({
    goal: plan.goal,
    targetAudience: plan.targetAudience,
    name: campaignName,
    projectId,
    chats: plan.data.map((d) => ({
      title: d.task,
      day: d.day,
      prompt: "",
      status: "pending",
      contents: [],
    })),
  });

  return planner ? JSON.parse(JSON.stringify(planner)) : null;
};

export const getCampaignPlanner = async (projectId: string) => {
  // const planners = await CampaignPlannerModel.find({ projectId }).lean() as unknown as CampaignPlannerType[];
  await connectToDb();

  const planners = JSON.parse(
    JSON.stringify(
      await CampaignPlannerModel.find({ projectId })
        .sort({ updatedAt: -1 })
        .lean()
    )
  ) as CampaignPlannerType[];

  return {
    chatsGroupedByCampaign: planners.map((p) => ({
      id: p._id,
      name: p.name,
      chats: p.chats,
      goal: p.goal,
      targetAudience: p.targetAudience,
      date: p.updatedAt,
      startDate: p.startDate,
    })),
  };
};

export const generateCampaignChat = async (props: {
  projectId: string;
  id: string;
  prompt: string;
  userId: string;
  day: number;
}) => {
  await connectToDb();

  const project = await ProjectModel.findById(props.projectId);
  const projectCampaign = await CampaignPlannerModel.findOne({
    projectId: props.projectId,
    _id: props.id,
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

export const changeCampaignData = async (
  id: string,
  name?: string,
  startDate?: Date
) => {
  await connectToDb();
  try {
    const updateFields: Record<string, any> = {};

    if (name !== undefined) updateFields.name = name;
    if (startDate !== undefined) updateFields.startDate = startDate;
    console.log({ id: id });
    console.log(updateFields);

    const planner = await CampaignPlannerModel.findOneAndUpdate(
      { _id: id },
      { $set: updateFields },
      { new: true }
    );
    console.log("Updated planner:", planner);

    return planner?.projectId?.toString() || false;
  } catch (error) {
    console.error("Error changing campaign data:", error);
    return false;
  }
};

export const toggleMarkAsComplete = async ({
  campaignId,
  day,
}: {
  campaignId: string;
  day: string;
}) => {
  await connectToDb();

  const data = await CampaignPlannerModel.findById(campaignId);

  if (!data) return null;

  const chat = data.chats.find((c: any) => c.day === Number(day));

  if (!chat) return null;

  chat.completed = !chat.completed;

  await data.save();

  return data.projectId.toString();
};
