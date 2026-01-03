"use server";

import { prisma } from "@/lib/prisma";
import { OauthPlatform, Prisma } from "@prisma/client";

type Props = {
  projectId: string;
  platform: string;
  content: string;
  date: Date;
  meta?: Prisma.InputJsonValue;
};

export const schedulePost = async (props: Props) => {
  try {
    // Verify project has OAuth provider mapped
    const projectProvider = await prisma.projectToOAuthProvider.findFirst({
      where: {
        projectId: props.projectId,
        oauthProvider: {
          platform: props.platform as OauthPlatform,
        },
      },
      include: {
        oauthProvider: true,
      },
    });

    if (!projectProvider) {
      console.log(
        `❌ No OAuth provider mapped for projectId: ${props.projectId}, platform: ${props.platform}`
      );
      return false;
    }

    console.log(
      `🔍 Scheduling post for projectId: ${props.projectId}, platform: ${props.platform}, date: ${props.date}`
    );

    const data = await prisma.scheduledPost.create({
      data: {
        projectId: props.projectId,
        platform: props.platform,
        content: props.content,
        date: props.date,
        status: "pending",
        oauthProviderId: projectProvider.oauthProviderId,
        ...(props.meta && { meta: props.meta })
      },
    });

    if (!data) {
      console.log(
        `❌ Failed to schedule post for projectId: ${props.projectId}, platform: ${props.platform}, date: ${props.date}`
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
