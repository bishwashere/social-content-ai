/**
 * Script to check detailed status of a specific scheduled post
 * 
 * Usage:
 *   npx tsx scripts/check-post-details.ts <postId>
 * 
 * Example:
 *   npx tsx scripts/check-post-details.ts 6935d4fa5540347f44055847
 */

import { prisma } from "../src/lib/prisma";

async function checkPostDetails(postId: string) {
  try {
    console.log(`\n🔍 Checking post: ${postId}\n`);

    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!post) {
      console.log("❌ Post not found\n");
      return;
    }

    const meta = post.meta as any;

    console.log("=".repeat(80));
    console.log("📋 POST DETAILS");
    console.log("=".repeat(80));
    console.log(`ID: ${post.id}`);
    console.log(`Platform: ${post.platform}`);
    console.log(`Status: ${post.status}`);
    console.log(`Date: ${new Date(post.date).toISOString()}`);
    console.log(`Project: ${post.project?.name || post.projectId}`);
    console.log(`Created At: ${new Date(post.createdAt).toISOString()}`);
    console.log(`Updated At: ${new Date(post.updatedAt).toISOString()}`);
    if (post.error) {
      console.log(`Error: ${post.error}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 STEP STATUS");
    console.log("=".repeat(80));
    
    console.log(`Step 1:`);
    console.log(`  - Completed: ${meta?.step1Completed ? "✅" : "❌"}`);
    console.log(`  - In Progress: ${meta?.step1InProgress ? "⚠️" : "✅"}`);
    console.log(`  - Error: ${meta?.step1Error || "None"}`);
    console.log(`  - Retry Count: ${meta?.step1RetryCount || 0}`);
    console.log(`  - Completed At: ${meta?.step1CompletedAt || "N/A"}`);
    
    console.log(`\nStep 2:`);
    console.log(`  - Completed: ${meta?.step2Completed ? "✅" : "❌"}`);
    console.log(`  - In Progress: ${meta?.step2InProgress ? "⚠️" : "✅"}`);
    console.log(`  - Error: ${meta?.step2Error || "None"}`);
    console.log(`  - Retry Count: ${meta?.step2RetryCount || 0}`);
    console.log(`  - Completed At: ${meta?.step2CompletedAt || "N/A"}`);
    console.log(`  - Blog Title: ${meta?.blog?.title ? meta.blog.title.substring(0, 50) + "..." : "N/A"}`);
    
    console.log(`\nStep 3:`);
    console.log(`  - Completed: ${meta?.step3Completed ? "✅" : "❌"}`);
    console.log(`  - In Progress: ${meta?.step3InProgress ? "⚠️" : "✅"}`);
    console.log(`  - Error: ${meta?.step3Error || "None"}`);
    console.log(`  - Retry Count: ${meta?.step3RetryCount || 0}`);
    console.log(`  - Completed At: ${meta?.step3CompletedAt || "N/A"}`);
    console.log(`  - Started At: ${meta?.step3StartedAt || "N/A"}`);
    console.log(`  - Webhook Sent: ${meta?.webhookSent ? "✅" : "❌"}`);
    console.log(`  - Article URL: ${meta?.articleUrl || "N/A"}`);
    
    console.log(`\nStep 4:`);
    console.log(`  - Completed: ${meta?.step4Completed ? "✅" : "❌"}`);
    console.log(`  - In Progress: ${meta?.step4InProgress ? "⚠️" : "✅"}`);
    console.log(`  - Error: ${meta?.step4Error || "None"}`);
    console.log(`  - Retry Count: ${meta?.step4RetryCount || 0}`);
    console.log(`  - Completed At: ${meta?.step4CompletedAt || "N/A"}`);

    console.log("\n" + "=".repeat(80));
    console.log("📝 METADATA");
    console.log("=".repeat(80));
    console.log(`Type: ${meta?.type || "N/A"}`);
    console.log(`Campaign ID: ${meta?.campaignId || "N/A"}`);
    console.log(`Day: ${meta?.day || "N/A"}`);
    console.log(`Topics: ${meta?.topics ? meta.topics.join(", ") : "N/A"}`);
    console.log(`Angles: ${meta?.angles ? meta.angles.join(", ") : "N/A"}`);
    console.log(`Webhook URL: ${meta?.webhook || "N/A"}`);
    console.log(`Platforms: ${meta?.platforms ? meta.platforms.join(", ") : "N/A"}`);
    console.log(`Timezone: ${meta?.timezone || "N/A"}`);

    // Check CampaignChat
    if (meta?.campaignId && meta?.day) {
      console.log("\n" + "=".repeat(80));
      console.log("💬 CAMPAIGN CHAT STATUS");
      console.log("=".repeat(80));
      
      const campaign = await prisma.campaignPlanner.findFirst({
        where: { id: meta.campaignId },
        select: {
          id: true,
          name: true,
          chats: {
            where: { day: meta.day },
            select: {
              id: true,
              day: true,
              status: true,
              contents: true,
              updatedAt: true,
            },
          },
        },
      });

      if (campaign) {
        console.log(`Campaign: ${campaign.name || campaign.id}`);
        const chat = campaign.chats[0];
        if (chat) {
          const contents = chat.contents as any;
          const blog = contents?.blog;
          console.log(`Chat Day: ${chat.day}`);
          console.log(`Chat Status: ${chat.status}`);
          console.log(`Chat Updated: ${new Date(chat.updatedAt).toISOString()}`);
          console.log(`Blog in Chat: ${blog ? "✅" : "❌"}`);
          if (blog) {
            console.log(`  - Title: ${blog.title ? blog.title.substring(0, 50) + "..." : "N/A"}`);
            console.log(`  - Webhook Sent: ${blog.webhookSent ? "✅" : "❌"}`);
            console.log(`  - Article URL: ${blog.articleUrl || "N/A"}`);
            console.log(`  - Generated At: ${blog.generatedAt || "N/A"}`);
          }
        } else {
          console.log(`❌ No chat found for day ${meta.day}`);
        }
      } else {
        console.log(`❌ Campaign not found: ${meta.campaignId}`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Check complete\n");
  } catch (error) {
    console.error("\n❌ Error checking post:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get postId from command line arguments
const postId = process.argv[2];

if (!postId) {
  console.error("\n❌ Error: Post ID is required");
  console.error("Usage: npx tsx scripts/check-post-details.ts <postId>\n");
  process.exit(1);
}

checkPostDetails(postId);
