"use server";

import { prisma } from "@/lib/prisma";

export const viewWall = async (wallId: string) => {
  try {
    await prisma.wall.update({
      where: {
        id: wallId,
      },
      data: {
        views: {
          increment: 1
        },
      },
    });
    return true;
  } catch (e) {
    console.error("Error viewing wall", e);
    return false;
  }
};
