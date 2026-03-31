"use server";

import { prisma } from "@/lib/prisma";
import { schedulePost } from "@/server-actions/schedule-post";
import { PLATFORM_IDS } from "@/constants/platforms";

// Helper to convert local time in user's selected timezone to UTC
// The user explicitly selects their timezone in the UI, so we have precise information
const convertLocalTimeToUTC = (year: number, month: number, day: number, hour: number, minute: number, tz: string): Date => {
  if (tz === "UTC") {
    return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  }
  
  // Step 1: Create a reference UTC date with the desired local time values
  const referenceUTC = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  
  // Step 2: Use the user's selected timezone to see what local time this UTC corresponds to
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(referenceUTC);
  const localTime = {
    year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
    month: parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1,
    day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
    hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
    minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0'),
  };
  
  // Step 3: Calculate the timezone offset (difference between desired and displayed time)
  const desiredMs = Date.UTC(year, month, day, hour, minute, 0, 0);
  const displayedMs = Date.UTC(localTime.year, localTime.month, localTime.day, localTime.hour, localTime.minute, 0, 0);
  const timezoneOffsetMs = desiredMs - displayedMs;
  
  // Step 4: Apply the offset to get the correct UTC time
  return new Date(referenceUTC.getTime() + timezoneOffsetMs);
};

export const scheduleCampaignPosts = async ({
  campaignId,
  projectId,
  autoPostTime,
  timezone,
  platforms,
}: {
  campaignId: string;
  projectId: string;
  autoPostTime: string; // Format: "HH:mm"
  timezone?: string; // IANA timezone string (e.g., "America/New_York")
  platforms: string[];
}): Promise<{ success: boolean; scheduledCount: number; errors: string[] }> => {
  try {
    // Get campaign with chats
    const campaign = await prisma.campaignPlanner.findFirst({
      where: {
        id: campaignId,
        projectId: projectId,
      },
      include: {
        chats: true,
      },
    });

    if (!campaign) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["Campaign not found"],
      };
    }

    if (!campaign.startDate) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["Campaign must have a start date"],
      };
    }

    const errors: string[] = [];
    let scheduledCount = 0;

    // Use timezone from parameter or default to UTC
    const timezoneToUse = timezone || "UTC";

    // Parse the user's selected auto-post time (e.g., "18:00" -> 18, 0)
    const [hours, minutes] = autoPostTime.split(":").map(Number);

    // For each chat in the campaign
    for (const chat of campaign.chats) {
      // Calculate the date for this chat: startDate + (day - 1) days
      // Use UTC-based date arithmetic to avoid server timezone contamination
      const startDateObj = new Date(campaign.startDate);
      const startYear = startDateObj.getUTCFullYear();
      const startMonth = startDateObj.getUTCMonth();
      const startDay = startDateObj.getUTCDate();
      
      // Create the target date by adding days to the campaign start date
      const targetDate = new Date(Date.UTC(startYear, startMonth, startDay + (chat.day - 1), 0, 0, 0, 0));
      
      // Extract date components (using UTC to avoid server timezone issues)
      const year = targetDate.getUTCFullYear();
      const month = targetDate.getUTCMonth();
      const day = targetDate.getUTCDate();
      
      // Convert: user's selected time + timezone -> UTC for database storage
      const chatDate = convertLocalTimeToUTC(year, month, day, hours, minutes, timezoneToUse);

      // Guardrail: Skip posts scheduled in the past
      const now = new Date();
      if (chatDate.getTime() < now.getTime()) {
        errors.push(
          `Skipped post for day ${chat.day}: Scheduled date is in the past (${chatDate.toISOString()})`
        );
        continue; // Skip this chat day
      }

      // Get contents and media
      const contents = (chat.contents as Record<string, string>) || {};
      const mediaRecord = (chat.media as Record<string, string>) || {};

      console.log(`[scheduleCampaignPosts] Day ${chat.day} media:`, mediaRecord);

      // For each platform
      for (const platform of platforms) {
        // Convert platform name (x -> twitter)
        const platformName = platform === PLATFORM_IDS.X ? "twitter" : platform;

        // Get media for this platform (if any)
        const platformMedia = mediaRecord[platform];

        console.log(`[scheduleCampaignPosts] Day ${chat.day}, Platform ${platform}: media =`, platformMedia);

        // Instagram requires existing media — auto-generation at post time is not supported
        if (platform === PLATFORM_IDS.INSTAGRAM && !platformMedia) {
          errors.push(
            `Skipped Instagram post for day ${chat.day}: No media found. Please generate or upload an image first.`
          );
          continue;
        }

        // Use existing content if available; if empty the cron will auto-generate at post time
        const content = contents[platform] || contents[platformName] || "";

        // Schedule the post
        try {
          const scheduled = await schedulePost({
            projectId: projectId,
            platform: platformName,
            content: content,
            date: chatDate.toISOString(),
            media: platformMedia,
            meta: {
              campaignId: campaignId,
              campaignName: campaign.name || "",
              day: chat.day,
              source: "campaign",
              timezone: timezoneToUse, // Store timezone for display
              localTime: autoPostTime, // Store original local time (e.g., "18:00") for display
            },
          });

          if (scheduled) {
            scheduledCount++;
          } else {
            // Check if OAuth provider is mapped
            const hasProvider = await prisma.projectToOAuthProvider.findFirst({
              where: {
                projectId: projectId,
                oauthProvider: {
                  platform: platformName as any,
                },
              },
            });

            if (!hasProvider) {
              errors.push(
                `Failed to schedule post for day ${chat.day} on ${platform}: No OAuth provider mapped. Please connect your ${platform} account in project settings.`
              );
            } else {
              errors.push(
                `Failed to schedule post for day ${chat.day} on ${platform}`
              );
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors.push(
            `Failed to schedule post for day ${chat.day} on ${platform}: ${errorMessage}`
          );
        }
      }
    }

    return {
      success: errors.length === 0,
      scheduledCount,
      errors,
    };
  } catch (error) {
    console.error("Error scheduling campaign posts:", error);
    return {
      success: false,
      scheduledCount: 0,
      errors: [
        error instanceof Error ? error.message : "Unknown error occurred",
      ],
    };
  }
};

export const scheduleCampaignTasks = async ({
  campaignId,
  projectId,
  autoPostTime,
  timezone,
  platforms,
}: {
  campaignId: string;
  projectId: string;
  autoPostTime: string; // Format: "HH:mm"
  timezone?: string; // IANA timezone string (e.g., "America/New_York")
  platforms: string[]; // Platforms to post to after blog is generated
}): Promise<{ success: boolean; scheduledCount: number; errors: string[] }> => {
  try {
    // Get campaign with chats
    const campaign = await prisma.campaignPlanner.findFirst({
      where: {
        id: campaignId,
        projectId: projectId,
      },
      include: {
        chats: true,
      },
    });

    if (!campaign) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["Campaign not found"],
      };
    }

    if (!campaign.startDate) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["Campaign must have a start date"],
      };
    }

    if (campaign.goal !== "Blog News") {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["This function is only for Blog News campaigns"],
      };
    }

    // Get Blog News metadata
    const metadata = campaign.blogNewsMetadata as {
      topics: string[];
      angles: string[];
      webhook: string;
      platforms?: string[];
      timezone?: string;
    } | null;
    
    // Use timezone from parameter, metadata, or default to UTC
    const timezoneToUse = timezone || metadata?.timezone || "UTC";

    if (!metadata) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["Blog News metadata not found"],
      };
    }

    // Use platforms from parameter or metadata
    const platformsToUse = platforms.length > 0 ? platforms : (metadata.platforms || []);

    if (platformsToUse.length === 0) {
      return {
        success: false,
        scheduledCount: 0,
        errors: ["No platforms selected for Blog News campaign"],
      };
    }

    const errors: string[] = [];
    let scheduledCount = 0;

    // Parse the user's selected auto-post time (e.g., "18:00" -> 18, 0)
    const [hours, minutes] = autoPostTime.split(":").map(Number);

    // For each chat in the campaign
    for (const chat of campaign.chats) {
      // Calculate the date for this chat: startDate + (day - 1) days
      // Use UTC-based date arithmetic to avoid server timezone contamination
      const startDateObj = new Date(campaign.startDate);
      const startYear = startDateObj.getUTCFullYear();
      const startMonth = startDateObj.getUTCMonth();
      const startDay = startDateObj.getUTCDate();
      
      // Create the target date by adding days to the campaign start date
      const targetDate = new Date(Date.UTC(startYear, startMonth, startDay + (chat.day - 1), 0, 0, 0, 0));
      
      // Extract date components (using UTC to avoid server timezone issues)
      const year = targetDate.getUTCFullYear();
      const month = targetDate.getUTCMonth();
      const day = targetDate.getUTCDate();
      
      // Convert: user's selected time + timezone -> UTC for database storage
      // Example: 16:00 EST -> 21:00 UTC (stored in DB)
      // When displayed, UTC is converted back to EST: 21:00 UTC -> 16:00 EST
      const chatDate = convertLocalTimeToUTC(year, month, day, hours, minutes, timezoneToUse);

      // Guardrail: Skip posts scheduled in the past
      const now = new Date();
      if (chatDate.getTime() < now.getTime()) {
        errors.push(
          `Skipped task for day ${chat.day}: Scheduled date is in the past (${chatDate.toISOString()})`
        );
        continue; // Skip this chat day
      }

      try {
        // Create metadata-only ScheduledPost record
        // Trim webhook URL to ensure consistency (should already be trimmed, but be safe)
        const webhookValue = metadata.webhook ? metadata.webhook.trim() : "";
        console.log(`[scheduleCampaignTasks] Saving webhook URL to ScheduledPost: ${webhookValue}`);
        
        // Final database-level guardrail: Check right before saving to database
        // This is the last validation before the database write operation
        const finalDateCheck = new Date(chatDate);
        const nowCheck = new Date();
        if (finalDateCheck.getTime() < nowCheck.getTime()) {
          console.error(
            `❌ DATABASE GUARDRAIL: Blocked attempt to save scheduled post with past date. campaignId: ${campaignId}, day: ${chat.day}, date: ${chatDate.toISOString()}`
          );
          errors.push(
            `Skipped task for day ${chat.day}: Scheduled date is in the past (${chatDate.toISOString()})`
          );
          // Skip database write - do not create the scheduled post
          continue;
        }
        
        await prisma.scheduledPost.create({
          data: {
            projectId,
            platform: "webhook", // Special identifier for Blog News
            content: "", // Empty - will be generated on-the-fly
            date: chatDate.toISOString(),
            status: "pending",
            oauthProviderId: null, // Not needed for webhook
            meta: {
              type: "blog-news",
              campaignId,
              day: chat.day,
              topics: metadata.topics,
              angles: metadata.angles,
              webhook: webhookValue, // Use trimmed value
              platforms: platformsToUse, // Store platforms for later use
              timezone: timezoneToUse, // Store timezone for display
              localTime: autoPostTime, // Store original local time (e.g., "18:00") for display
            },
          },
        });

        scheduledCount++;
      } catch (error) {
        errors.push(
          `Failed to schedule day ${chat.day}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return {
      success: errors.length === 0,
      scheduledCount,
      errors,
    };
  } catch (error) {
    console.error("Error scheduling campaign tasks:", error);
    return {
      success: false,
      scheduledCount: 0,
      errors: [
        error instanceof Error ? error.message : "Unknown error occurred",
      ],
    };
  }
};
