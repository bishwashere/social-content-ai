"use server";
import { prisma } from "@/lib/prisma";

export type UpdateFirstViewTooltipData = {
  userId: string;
  updateData: {
    addProject?: boolean;
    contentPlanner?: boolean;
    quickGenerate?: boolean;
    videoGeneration?: boolean;
    dismissedProjectAlerts?: string[];
  };
};

export async function getFirstViewTooltip(userId: string) {
  const doc = await prisma.firstViewTooltip.findFirst({
    where: { userId },
  });

  if (!doc) {
    return prisma.firstViewTooltip.create({
      data: {
        userId,
        addProject: false,
        contentPlanner: false,
        quickGenerate: false,
        videoGeneration: false,
        dismissedProjectAlerts: [],
      },
    });
  }

  return doc;
}

export async function updateFirstViewTooltip({
  userId,
  updateData,
}: UpdateFirstViewTooltipData) {
  const existingTooltip = await prisma.firstViewTooltip.findFirst({
    where: { userId },
  });

  if (existingTooltip) {
    return prisma.firstViewTooltip.update({
      where: { id: existingTooltip.id },
      data: updateData,
    });
  }

  return prisma.firstViewTooltip.create({
    data: {
      userId,
      ...updateData,
    },
  });
}

export async function resetFirstViewTooltip(userId: string) {
  const resetData = {
    addProject: false,
    contentPlanner: false,
    quickGenerate: false,
    videoGeneration: false,
  };

  const existingTooltip = await prisma.firstViewTooltip.findFirst({
    where: { userId },
  });

  if (existingTooltip) {
    return prisma.firstViewTooltip.update({
      where: { id: existingTooltip.id },
      data: resetData,
    });
  }

  return prisma.firstViewTooltip.create({
    data: {
      userId,
      ...resetData,
    },
  });
}
