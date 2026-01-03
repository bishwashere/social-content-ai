"use server";

import { prisma } from "@/lib/prisma";
import { OauthPlatform, Prisma } from "@prisma/client";

type Props = {
  projectId: string;
  platform: string;
  content: string;
  date: string;
  meta?: Prisma.InputJsonValue;
};

export const schedulePost = async (props: Props) => {
  try {
    // Guardrail: Check if the scheduled date is in the past
    const scheduledDate = new Date(props.date);
    const now = new Date();
    
    if (scheduledDate.getTime() < now.getTime()) {
      console.log(
        `❌ Cannot schedule post in the past for projectId: ${props.projectId}, platform: ${props.platform}, date: ${props.date}`
      );
      return false;
    }

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

    // Final database-level guardrail: Double-check date is not in the past before saving
    const finalDateCheck = new Date(props.date);
    const nowCheck = new Date();
    if (finalDateCheck.getTime() < nowCheck.getTime()) {
      console.error(
        `❌ DATABASE GUARDRAIL: Blocked attempt to save post with past date. projectId: ${props.projectId}, platform: ${props.platform}, date: ${props.date}`
      );
      return false;
    }

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
