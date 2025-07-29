"use server";

import { prisma } from "@/lib/prisma";

type Props = {
  userId: string;
  platform: string;
  content: string;
  date: string;
};

export const schedulePost = async (props: Props) => {
  try {
    console.log(
      `🔍 Scheduling post for userId: ${props.userId}, platform: ${props.platform}, date: ${props.date}`
    );
    const data = await prisma.scheduledPost.create({
      data: {
        userId: props.userId,
        platform: props.platform,
        content: props.content,
        date: props.date,
        status: "pending",
      },
    });

    if (!data) {
      console.log(
        `❌ Failed to schedule post for userId: ${props.userId}, platform: ${props.platform}, date: ${props.date}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("❌ Error scheduling post:", error);
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace available"
    );
    return false;
  }
};
