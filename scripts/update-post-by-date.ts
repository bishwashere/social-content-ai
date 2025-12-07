/**
 * Script to update a scheduled post date by finding it via scheduled date
 * 
 * Usage:
 *   npx tsx scripts/update-post-by-date.ts "2025-12-13T01:45:00.000Z"
 */

import { prisma } from "../src/lib/prisma";

async function updatePostByDate(targetDate: string) {
  try {
    const targetDateObj = new Date(targetDate);
    
    console.log(`\n🔍 Finding post scheduled for: ${targetDateObj.toISOString()}\n`);

    // Find posts around that date (within 1 hour window)
    const allPosts = await prisma.scheduledPost.findMany({
      where: {
        platform: "webhook",
        status: "pending",
      },
      select: {
        id: true,
        date: true,
        status: true,
        meta: true,
      },
    });

    // Find the post closest to the target date
    const matchingPosts = allPosts.filter((p) => {
      const postDate = new Date(p.date);
      const timeDiff = Math.abs(postDate.getTime() - targetDateObj.getTime());
      // Within 1 hour
      return timeDiff < 60 * 60 * 1000;
    });

    if (matchingPosts.length === 0) {
      console.log("❌ No pending webhook post found for that date.");
      return;
    }

    // Get the closest match
    const post = matchingPosts.reduce((closest, current) => {
      const closestDiff = Math.abs(new Date(closest.date).getTime() - targetDateObj.getTime());
      const currentDiff = Math.abs(new Date(current.date).getTime() - targetDateObj.getTime());
      return currentDiff < closestDiff ? current : closest;
    });

    const meta = post.meta as any;
    console.log(`✅ Found post:`);
    console.log(`   ID: ${post.id}`);
    console.log(`   Current Date: ${new Date(post.date).toISOString()}`);
    console.log(`   Status: ${post.status}`);
    console.log(`   Campaign: ${meta?.campaignId || "N/A"}`);
    console.log(`   Day: ${meta?.day || "N/A"}`);
    console.log("");

    // Set date to 5 minutes ago
    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 5);

    // Update the post
    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        date: pastDate.toISOString(),
        status: "pending", // Ensure it's pending
      },
    });

    console.log(`✅ Updated post:`);
    console.log(`   New Date: ${pastDate.toISOString()}`);
    console.log(`   Status: pending`);
    console.log(`\n🎯 Post is ready to be picked up by cron.`);
  } catch (error) {
    console.error("\n❌ Error updating post:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get date from command line argument
const targetDate = process.argv[2];
if (!targetDate) {
  console.log("Usage: npx tsx scripts/update-post-by-date.ts \"2025-12-13T01:45:00.000Z\"");
  process.exit(1);
}

updatePostByDate(targetDate);

