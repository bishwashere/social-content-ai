"use server";

import { prisma } from "@/lib/prisma";
import { OauthPlatform, Prisma } from "@prisma/client";

type Props = {
  projectId: string;
  platform: string;
  content: string;
  date: string;
  media?: string;
  meta?: Prisma.InputJsonValue;
};

export const schedulePost = async (props: Props) => {
  try {
    // Guardrail: Check if the scheduled date is in the past
    let scheduledDate = new Date(props.date);
    const now = new Date();
    
    // If date is in the past, reschedule for 1 minute from now
    if (scheduledDate.getTime() < now.getTime()) {
      console.log(
        `⚠️ Scheduled date is in the past for projectId: ${props.projectId}, platform: ${props.platform}, date: ${props.date}. Rescheduling for now + 1 minute.`
      );
      scheduledDate = new Date(now.getTime() + 60 * 1000); // 1 minute from now
      console.log(
        `✅ Rescheduled to: ${scheduledDate.toISOString()}`
      );
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
      `🔍 Scheduling post for projectId: ${props.projectId}, platform: ${props.platform}, date: ${scheduledDate.toISOString()}`
    );

    // Final database-level guardrail: Double-check date is not in the past before saving
    const nowCheck = new Date();
    if (scheduledDate.getTime() < nowCheck.getTime()) {
      // One more reschedule attempt if still in the past
      scheduledDate = new Date(nowCheck.getTime() + 60 * 1000);
      console.log(
        `⚠️ Final guardrail: Rescheduled again to: ${scheduledDate.toISOString()}`
      );
    }

    const data = await prisma.scheduledPost.create({
      data: {
        projectId: props.projectId,
        platform: props.platform,
        content: props.content,
        date: scheduledDate.toISOString(),
        status: "pending",
        oauthProviderId: projectProvider.oauthProviderId,
        ...(props.media && { media: props.media }),
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
