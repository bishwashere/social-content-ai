/**
 * Script to list all scheduled posts with their campaign IDs
 * 
 * Usage:
 *   npx tsx scripts/list-scheduled-posts.ts
 */

import { prisma } from "../src/lib/prisma";

async function listScheduledPosts() {
  try {
    console.log(`\n🔍 Fetching all scheduled posts...\n`);

    const scheduledPosts = await prisma.scheduledPost.findMany({
      select: {
        id: true,
        platform: true,
        date: true,
        status: true,
        meta: true,
      },
      take: 50, // Limit to first 50
    });

    console.log(`📊 Found ${scheduledPosts.length} scheduled post(s)\n`);

    if (scheduledPosts.length === 0) {
      console.log("✅ No scheduled posts found.\n");
      return;
    }

    console.log("📋 Scheduled posts:");
    console.log("=".repeat(80));
    scheduledPosts.forEach((post, index) => {
      const meta = post.meta as any;
      console.log(`${index + 1}. Post ID: ${post.id}`);
      console.log(`   Platform: ${post.platform}`);
      console.log(`   Date: ${new Date(post.date).toLocaleString()}`);
      console.log(`   Status: ${post.status}`);
      if (meta?.campaignId) {
        console.log(`   Campaign ID: ${meta.campaignId}`);
      }
      if (meta?.day) {
        console.log(`   Day: ${meta.day}`);
      }
      if (meta?.source) {
        console.log(`   Source: ${meta.source}`);
      }
      console.log("");
    });
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n❌ Error listing scheduled posts:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listScheduledPosts();

