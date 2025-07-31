"use server";

import { AI } from "@/lib/ai";
import { CampaignPlanner } from "@/lib/campaign-planner";
import { getRandomInRange } from "@/lib/getRandomInRange";
import { prisma } from "@/lib/prisma";

export const startCampaignPlanner = async (
  id: string | undefined,
  projectId: string,
  campaignName: string,
  plan: CampaignPlanner,
  userId: string
) => {
  const chatData: {
    title: string;
    day: number;
    prompt: string;
    status: "PENDING" | "GENERATED";
    completed: boolean;
    // plannerId: string;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    contents: {};
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    tickMark: {};
  }[] = plan.data.map((d) => ({
    title: d.task,
    day: d.day,
    prompt: "",
    status: "PENDING",
    completed: false,
    // plannerId: "sdf",
    contents: {}, // JSON
    tickMark: {}, // JSON
  }));

  // Fetch user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.remainingChatGenerations < 10) {
    throw new Error("You donot have enough coins to generate chat.");
  }

  // Deduct 10 generations
  await prisma.user.update({
    where: { id: userId },
    data: {
      remainingChatGenerations: {
        decrement: 10,
      },
    },
  });

  if (id) {
    const updated = await prisma.campaignPlanner.update({
      where: { id },
      data: {
        chats: {
          updateMany: {
            where: {},
            data: {
              contents: {},
              status: "PENDING",
            }
          }
        },
        goal: plan.goal,
        targetAudience: plan.targetAudience,
        name: campaignName,
      },
      include: {
        chats: true,
      },
    });

    return updated;
  }

  const created = await prisma.campaignPlanner.create({
    data: {
      projectId,
      goal: plan.goal,
      targetAudience: plan.targetAudience,
      name: campaignName,
      chats: {
        create: chatData,
      },
    },
    include: {
      chats: true,
    },
  });

  return created;
};

export const getCampaignPlanner = async (projectId: string) => {
  const planners = await prisma.campaignPlanner.findMany({
    where: {
      projectId: projectId,
    },
    include: { chats: true },
  });

  if (planners)
    return {
      chatsGroupedByCampaign: planners.map((p) => ({
        id: p.id,
        name: p.name,
        chats: p.chats,
        goal: p.goal,
        targetAudience: p.targetAudience,
        date: p.updatedAt,
        startDate: p.startDate,
        projectId: p.projectId.toString(),
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
  // Find project
  const project = await prisma.projects.findFirst({
    where: { id: props.projectId },
  });

  if (!project) {
    return {
      success: false,
      message: "Project not found",
    };
  }

  // Find campaign planner with matching ID and projectId
  const projectCampaign = await prisma.campaignPlanner.findFirst({
    where: {
      id: props.id,
      projectId: props.projectId,
    },
    include: {
      chats: true,
    },
  });

  if (!projectCampaign) {
    return {
      success: false,
      message: "Campaign not found",
    };
  }

  const ai = new AI();
  console.log("calling ai");
  console.log(projectCampaign);
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

  // Find the specific chat for the given day
  const chatToUpdate = projectCampaign.chats.find(
    (chat) => chat.day === props.day
  );

  if (!chatToUpdate) {
    return {
      success: false,
      message: `No chat found for day ${props.day}`,
    };
  }

  const subredditData = await prisma.projectsSubredditData.findFirst({
    where: {
      projectId: props.projectId,
    },
  });

  const subredditIndex = getRandomInRange(
    0,
    subredditData?.subreddit.length ? subredditData?.subreddit.length - 1 : 0
  );

  await prisma.campaignChat.update({
    where: {
      id: chatToUpdate.id,
    },
    data: {
      contents: chatFromAI,
      status: "GENERATED",
      subreddit: subredditData?.subreddit[subredditIndex] || "",
    },
  });

  return {
    success: true,
  };
};

export const changeCampaignData = async (
  id: string,
  name?: string,
  startDate?: Date
): Promise<string | false> => {
  try {
    const updateFields: Record<string, any> = {};

    if (name !== undefined) updateFields.name = name;
    if (startDate !== undefined) updateFields.startDate = startDate;

    console.log({ id });
    console.log(updateFields);

    const planner = await prisma.campaignPlanner.update({
      where: { id },
      data: updateFields,
      include: {
        project: true, // optional, if you want to log project details
      },
    });

    console.log("Updated planner:", planner);

    return planner.projectId || false;
  } catch (error) {
    console.error("Error changing campaign data:", error);
    return false;
  }
};

export const deleteCampaign = async (id: string): Promise<boolean> => {
  try {
    await prisma.campaignPlanner.delete({
      where: { id },
    });

    return true;
  } catch (error) {
    console.error("Error deleting campaign data:", error);
    return false;
  }
};

export const toggleMarkAsComplete = async ({
  campaignId,
  day,
}: {
  campaignId: string;
  day: string;
}): Promise<string | null> => {
  const dayNumber = Number(day);

  // Find the chat record by campaign ID and day
  const chat = await prisma.campaignChat.findFirst({
    where: {
      plannerId: campaignId,
      day: dayNumber,
    },
  });

  if (!chat) return null;

  // Toggle the completed field
  const updated = await prisma.campaignChat.update({
    where: { id: chat.id },
    data: {
      completed: !chat.completed,
    },
    include: {
      planner: true,
    },
  });

  return updated.planner?.projectId || "";
};

export const toggleTickMark = async ({
  campaignId,
  day,
  platform,
  tick,
}: {
  campaignId: string;
  day: number;
  platform: string;
  tick: boolean;
}): Promise<string | null> => {
  const chat = await prisma.campaignChat.findFirst({
    where: {
      plannerId: campaignId,
      day: day,
    },
  });

  if (!chat) return null;

  // Update the tickMark JSON
  const currentTickMark = (chat.tickMark as Record<string, boolean>) || {};
  currentTickMark[platform] = tick;

  const updated = await prisma.campaignChat.update({
    where: { id: chat.id },
    data: {
      tickMark: currentTickMark,
    },
    include: {
      planner: true,
    },
  });

  return updated.planner?.projectId || "";
};

export const editChatContent = async ({
  campaignId,
  day,
  platform,
  content
}: {
  campaignId: string;
  day: number;
  platform: string;
  content: string;
}): Promise<string | null> => {
  const chat = await prisma.campaignChat.findFirst({
    where: {
      plannerId: campaignId,
      day: day,
    },
  });

  if (!chat) return null;

  // Update the tickMark JSON
  const currentContents = (chat.contents as Record<string, string>) || {};
  currentContents[platform] = content;

  const updated = await prisma.campaignChat.update({
    where: { id: chat.id },
    data: {
      contents: currentContents,
    },
    include: {
      planner: true,
    },
  });

  return updated.planner?.projectId || "";
};
